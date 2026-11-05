import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Store, Plus, Edit2, Trash2, CheckCircle2, MapPin, RefreshCw, Users, UserCheck } from 'lucide-react';

export const DEFAULT_BRANCHES_SEED = [
  { name: 'Punto Principal - Express', code: 'EXP-01', location: 'Local Central', active: true },
  { name: 'Punto Parque Central', code: 'EXP-02', location: 'Parque Central', active: true },
  { name: 'Móvil Boulevard', code: 'EXP-03', location: 'Boulevard Principal', active: true }
];

export default function ExpressSucursales({ activeBranch, onSelectBranch, onBranchesChanged }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Colaboradores y asignación
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'express_branches'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        // Sembrar sucursales por defecto
        for (const b of DEFAULT_BRANCHES_SEED) {
          const docRef = await addDoc(collection(db, 'express_branches'), {
            ...b,
            createdAt: serverTimestamp()
          });
          list.push({ id: docRef.id, ...b });
        }
        toast.info('Se han creado puntos de venta iniciales.');
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(list);

      // Si no hay branch activo, seleccionar el primero
      if (!activeBranch && list.length > 0) {
        onSelectBranch(list[0]);
      }
      if (onBranchesChanged) onBranchesChanged(list);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
      toast.error('Error al cargar puntos de venta');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error('Error cargando colaboradores:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setName(b.name);
    setCode(b.code || '');
    setLocation(b.location || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setLocation('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Ingresa el nombre del punto de venta');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: (code || name.substring(0, 4)).trim().toUpperCase(),
        location: location.trim(),
        active: true,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'express_branches', editingId), payload);
        toast.success(`Punto "${name}" actualizado con éxito.`);
      } else {
        const docRef = await addDoc(collection(db, 'express_branches'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success(`Punto "${name}" creado.`);
        if (!activeBranch) onSelectBranch({ id: docRef.id, ...payload });
      }

      handleCancel();
      fetchBranches();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar sucursal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, bName) => {
    if (branches.length <= 1) return toast.error('Debes mantener al menos un punto de venta activo.');
    if (!confirm(`¿Estás seguro de eliminar el punto "${bName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'express_branches', id));
      toast.success('Punto de venta eliminado');
      fetchBranches();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  // ASIGNAR SUCURSAL A UN COLABORADOR
  const handleAssignBranchToUser = async (user, branchId) => {
    try {
      const targetBranch = branches.find(b => b.id === branchId);
      const bName = targetBranch ? targetBranch.name : null;

      await updateDoc(doc(db, 'users', user.uid), {
        assignedBranchId: branchId || null,
        assignedBranchName: bName,
        updatedAt: serverTimestamp()
      });

      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, assignedBranchId: branchId, assignedBranchName: bName } : u));
      toast.success(`Sucursal "${bName || 'Sin asignar'}" asignada a ${user.name || user.email}`);
    } catch (err) {
      console.error('Error al asignar sucursal a usuario:', err);
      toast.error('Error al asignar sucursal');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={26} /> Administración de Puntos de Venta (Sucursales)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Crea nuevos puntos de venta y asigna a cada cajero su sucursal fija para que no puedan cambiarla.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => { fetchBranches(); fetchUsers(); }} title="Recargar">
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* FORMULARIO AGREGAR / EDITAR */}
        <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: editingId ? '#38bdf8' : '#22c55e' }}>
            {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
            {editingId ? 'Editar Sucursal' : 'Nueva Sucursal / Punto'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Nombre del Punto o Sucursal *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Carretón Parque Central"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Código Corto
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. EXP-04"
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ width: '100%', textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Ubicación / Referencia
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Frente al kiosco central"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', fontWeight: 'bold' }}
                disabled={saving}
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Sucursal'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  style={{ padding: '0.8rem' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTADO DE PUNTOS DE VENTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Sucursales Activas ({branches.length})
          </h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando sucursales...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {branches.map(b => {
                const isSelected = activeBranch?.id === b.id;
                return (
                  <div
                    key={b.id}
                    style={{
                      backgroundColor: isSelected ? 'rgba(246, 167, 75, 0.12)' : 'var(--surface-color)',
                      border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                          {b.name}
                        </strong>
                        {b.code && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {b.code}
                          </span>
                        )}
                        {isSelected && (
                          <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <CheckCircle2 size={14} /> Seleccionado
                          </span>
                        )}
                      </div>
                      {b.location && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={14} /> {b.location}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isSelected && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            onSelectBranch(b);
                            toast.success(`Cambiado a punto: ${b.name}`);
                          }}
                        >
                          Usar este Punto
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.6rem' }}
                        onClick={() => handleEdit(b)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.6rem', color: '#ef4444' }}
                        onClick={() => handleDelete(b.id, b.name)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN EXCLUSIVA: ASIGNACIÓN DE SUCURSAL A CAJEROS / COLABORADORES */}
      <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Users size={24} color="var(--primary-color)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              Asignación de Sucursal a Colaboradores
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Aquí defines a qué punto de venta está asignado cada cajero. Ellos no podrán cambiar de sucursal ni acceder a los cierres.
            </span>
          </div>
        </div>

        {loadingUsers ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando colaboradores...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay colaboradores registrados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem' }}>COLABORADOR</th>
                  <th style={{ padding: '0.75rem' }}>ROL</th>
                  <th style={{ padding: '0.75rem' }}>SUCURSAL ASIGNADA</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isUserAdmin = u.role === 'ADMIN';
                  return (
                    <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name || 'Sin Nombre'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isUserAdmin ? 'rgba(249, 115, 22, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: isUserAdmin ? '#f97316' : '#38bdf8'
                        }}>
                          {u.role || 'CAJERO'}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem' }}>
                        {isUserAdmin ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            (Acceso total a todas las sucursales)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '320px' }}>
                            <select
                              className="input-field"
                              value={u.assignedBranchId || ''}
                              onChange={(e) => handleAssignBranchToUser(u, e.target.value)}
                              style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                            >
                              <option value="">-- Sin Sucursal Asignada --</option>
                              {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            {u.assignedBranchId && (
                              <UserCheck size={18} color="#22c55e" title="Sucursal Asignada" />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
