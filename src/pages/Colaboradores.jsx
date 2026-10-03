import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Shield, Lock, Ban, CheckCircle, 
  Trash2, Mail, Save, X
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth as primaryAuth } from '../firebase';
import { toast } from 'sonner';

// Firebase config for secondary app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const MODULES = [
  { id: 'dashboard', name: 'Dashboard Principal' },
  { id: 'pos', name: 'Punto de Venta (POS)' },
  { id: 'menu', name: 'Men General' },
  { id: 'menu_dia', name: 'Men del Da' },
  { id: 'cocina', name: 'KDS (Cocina)' },
  { id: 'clientes', name: 'Cuentas por Cobrar' },
  { id: 'facturas', name: 'Historial de Facturas' },
  { id: 'gastos', name: 'Gastos y Cierre' },
  { id: 'finanzas', name: 'Finanzas' },
  { id: 'club', name: 'Club de Cadetes' },
  { id: 'colaboradores', name: 'Administrar Colaboradores' }
];

export default function Colaboradores() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(null); // stores the user object
  
  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('CAJERO');
  const [newPassword, setNewPassword] = useState('Sopota2026');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Permissions form
  const [editPerms, setEditPerms] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const uList = [];
      snap.forEach(doc => uList.push({ uid: doc.id, ...doc.data() }));
      setUsers(uList);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // 1. Initialize secondary app to create user without logging out admin
      let secondaryApp;
      let secondaryAuth;
      try {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        secondaryAuth = getAuth(secondaryApp);
      } catch (err) {
        // App might already be initialized if they open modal twice
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp' + Date.now());
        secondaryAuth = getAuth(secondaryApp);
      }

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const newUid = userCredential.user.uid;

      // 3. Define default permissions based on role
      const defaultPerms = {};
      if (newRole === 'ADMIN') {
        defaultPerms['*'] = true;
      } else if (newRole === 'CAJERO') {
        defaultPerms['pos'] = true;
        defaultPerms['clientes'] = true;
      } else if (newRole === 'COCINERO') {
        defaultPerms['cocina'] = true;
      }

      // 4. Save to Firestore `users`
      await setDoc(doc(db, 'users', newUid), {
        email: newEmail,
        name: newName,
        role: newRole,
        permissions: defaultPerms,
        requirePasswordChange: true,
        active: true,
        createdAt: new Date()
      });

      toast.success('Usuario creado. Se requerir cambio de contrasea al ingresar.');
      setShowCreateModal(false);
      
      // Reset form
      setNewEmail(''); setNewName(''); setNewPassword('Sopota2026');
      fetchUsers();
      
    } catch (error) {
      console.error(error);
      toast.error('Error creando usuario: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (uid, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), { active: !currentStatus });
      toast.success(currentStatus ? 'Usuario suspendido' : 'Usuario reactivado');
      fetchUsers();
    } catch (e) {
      toast.error('Error actualizando estado');
    }
  };

  const handleSendReset = async (email) => {
    try {
      await sendPasswordResetEmail(primaryAuth, email);
      toast.success(`Correo de recuperacin enviado a ${email}`);
    } catch (e) {
      toast.error('Error enviando correo: ' + e.message);
    }
  };

  const openPermsModal = (u) => {
    setShowPermsModal(u);
    setEditPerms(u.permissions || {});
  };

  const togglePermission = (modId) => {
    setEditPerms(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const savePermissions = async () => {
    try {
      await updateDoc(doc(db, 'users', showPermsModal.uid), {
        permissions: editPerms
      });
      toast.success('Permisos actualizados');
      setShowPermsModal(null);
      fetchUsers();
    } catch (e) {
      toast.error('Error guardando permisos');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-color)' }}>Colaboradores</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona los accesos y contraseas de tu equipo.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} /> Nuevo Colaborador
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
              <th style={{ padding: '1rem' }}>Usuario</th>
              <th style={{ padding: '1rem' }}>Rol Asignado</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem' }}>Seguridad</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Cargando usuarios...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No hay usuarios registrados.</td></tr>
            ) : users.map(u => (
              <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{u.name || 'Sin Nombre'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    {u.role || 'GUEST'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {u.active !== false ? (
                    <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}><CheckCircle size={16}/> Activo</span>
                  ) : (
                    <span style={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}><Ban size={16}/> Suspendido</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {u.requirePasswordChange ? (
                    <span style={{ color: '#FF9800', fontSize: '0.85rem' }}>⚠️ Clave Temporal</span>
                  ) : (
                    <span style={{ color: '#4CAF50', fontSize: '0.85rem' }}>✓ Clave Privada</span>
                  )}
                </td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button className="icon-btn" title="Editar Permisos" onClick={() => openPermsModal(u)}>
                    <Shield size={20} color="#2196F3" />
                  </button>
                  <button className="icon-btn" title="Restablecer Clave" onClick={() => handleSendReset(u.email)}>
                    <Mail size={20} color="#FF9800" />
                  </button>
                  <button className="icon-btn" title={u.active !== false ? "Suspender" : "Reactivar"} onClick={() => handleToggleActive(u.uid, u.active !== false)}>
                    <Ban size={20} color={u.active !== false ? "#f44336" : "#4CAF50"} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Nuevo Colaborador</h2>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={24}/></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Correo Electrnico</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Rol Inicial (Plantilla de Permisos)</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="CAJERO">Cajero</option>
                  <option value="COCINERO">Cocina / KDS</option>
                  <option value="ADMIN">Administrador (Acceso Total)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contrasea Temporal</label>
                <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <small style={{ color: 'var(--text-secondary)' }}>El usuario deber cambiarla obligatoriamente al entrar.</small>
              </div>
              
              <button type="submit" className="btn-primary" disabled={isCreating}>
                {isCreating ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSIONS MODAL */}
      {showPermsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Permisos de {showPermsModal.name}</h2>
              <button className="icon-btn" onClick={() => setShowPermsModal(null)}><X size={24}/></button>
            </div>
            
            {editPerms['*'] ? (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                <strong>Este usuario tiene LLAVE MAESTRA (Acceso a todo).</strong>
                <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setEditPerms({})}>Quitar Llave Maestra</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {MODULES.map(mod => (
                  <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!editPerms[mod.id]} 
                      onChange={() => togglePermission(mod.id)} 
                      style={{ transform: 'scale(1.2)' }}
                    />
                    {mod.name}
                  </label>
                ))}
              </div>
            )}
            
            <button className="btn-primary" style={{ width: '100%' }} onClick={savePermissions}>
              <Save size={20} /> Guardar Permisos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
