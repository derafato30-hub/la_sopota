import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Zap, Package, Calculator, Palette, Store, ChefHat, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Express.css';

import ExpressVenta from './ExpressVenta';
import ExpressInventario from './ExpressInventario';
import ExpressCierre from './ExpressCierre';
import ExpressConfigSopas from './ExpressConfigSopas';
import ExpressSucursales, { DEFAULT_BRANCHES_SEED } from './ExpressSucursales';
import { DEFAULT_SOUPS_SEED } from './ExpressConfigSopas';

export default function Express() {
  const { currentUser, userRole, isAdmin: authIsAdmin, assignedBranchId, assignedBranchName } = useAuth();

  const roleUpper = (userRole || '').toString().trim().toUpperCase();
  const emailLower = (currentUser?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    authIsAdmin ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'SUPERADMIN' ||
    roleUpper === 'ADMINISTRADOR' ||
    roleUpper === 'OWNER' ||
    emailLower.includes('admin') ||
    emailLower.includes('sopota') ||
    emailLower === 'elmermerino04@gmail.com'
  );

  const [activeTab, setActiveTab] = useState('VENTA'); // 'VENTA' | 'INVENTARIO' | 'CIERRE' | 'SOPAS' | 'SUCURSALES'
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [soups, setSoups] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // Si no es admin y está en una pestaña restringida (o intentando inventario), forzar 'VENTA'
  useEffect(() => {
    if (!isAdmin && activeTab !== 'VENTA') {
      setActiveTab('VENTA');
    }
  }, [isAdmin, activeTab]);

  // 1. Cargar sucursales y sopas al iniciar con auto-siembra si están vacías
  useEffect(() => {
    loadInitialData();
  }, [assignedBranchId, isAdmin]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Cargar sucursales
      const bSnap = await getDocs(collection(db, 'express_branches'));
      let bList = [];
      bSnap.forEach(d => bList.push({ id: d.id, ...d.data() }));

      // Si no hay sucursales creadas en la base de datos, sembrar las iniciales
      if (bList.length === 0) {
        for (const b of DEFAULT_BRANCHES_SEED) {
          const docRef = await addDoc(collection(db, 'express_branches'), {
            ...b,
            createdAt: serverTimestamp()
          });
          bList.push({ id: docRef.id, ...b });
        }
      }

      bList.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(bList);

      // ASIGNACIÓN DE SUCURSAL ACTIVA:
      // Si el usuario NO es admin, queda ESTRICTAMENTE bloqueado a su sucursal asignada
      let resolvedBranch = null;
      if (!isAdmin) {
        if (assignedBranchId) {
          resolvedBranch = bList.find(b => b.id === assignedBranchId) || bList[0];
        } else {
          resolvedBranch = bList[0];
        }
      } else {
        // Si es Admin, puede cambiar de sucursal libremente (recuerda selección previa)
        const savedBranchId = localStorage.getItem('sopota_express_active_branch');
        resolvedBranch = bList.find(b => b.id === savedBranchId) || bList[0];
      }

      setActiveBranch(resolvedBranch);

      // Cargar sopas
      const sSnap = await getDocs(collection(db, 'express_soups'));
      let sList = [];
      sSnap.forEach(d => sList.push({ id: d.id, ...d.data() }));

      // Si no hay sopas, sembrar iniciales
      if (sList.length === 0) {
        for (const item of DEFAULT_SOUPS_SEED) {
          const docRef = await addDoc(collection(db, 'express_soups'), {
            ...item,
            createdAt: serverTimestamp()
          });
          sList.push({ id: docRef.id, ...item });
        }
      }

      sList.sort((a, b) => a.name.localeCompare(b.name));
      setSoups(sList);
    } catch (err) {
      console.error('Error al inicializar Express:', err);
      toast.error('Error al cargar datos de La Sopota Express');
    } finally {
      setLoading(false);
    }
  };

  // 2. Escuchar la sesión activa de inventario de la sucursal seleccionada en tiempo real
  useEffect(() => {
    if (!activeBranch) {
      setSession(null);
      return;
    }

    const sessionId = `${activeBranch.id}_${todayStr}`;
    const sessionRef = doc(db, 'express_sessions', sessionId);

    const unsub = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setSession({ id: docSnap.id, ...docSnap.data() });
      } else {
        setSession(null);
      }
    }, (err) => {
      console.warn('Error escuchando sesión de inventario:', err);
    });

    return () => unsub();
  }, [activeBranch, todayStr]);

  const handleSelectBranch = (b) => {
    // Solo el administrador tiene permiso de cambiar de sucursal
    if (!isAdmin) {
      return toast.error('Solo los administradores pueden cambiar de sucursal.');
    }
    setActiveBranch(b);
    if (b) localStorage.setItem('sopota_express_active_branch', b.id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <ChefHat size={48} color="var(--primary-color)" style={{ animation: 'bounce 1s infinite' }} />
        <h3 style={{ color: 'var(--text-secondary)' }}>Cargando La Sopota Express...</h3>
      </div>
    );
  }

  return (
    <div className="express-container">
      {/* 1. TOP HEADER CON MARCA Y SUCURSAL */}
      <header className="express-header">
        <div className="express-brand">
          <ChefHat size={30} color="var(--primary-color)" />
          <h1 className="express-brand-title">
            La Sopota Express
            <span className="express-badge-fast">⚡ Rápido</span>
          </h1>
        </div>

        {/* SELECTOR O BADGE FIJO DE SUCURSAL */}
        {isAdmin ? (
          /* VISTA ADMINISTRADOR: Puede cambiar de sucursal a voluntad */
          <div className="express-branch-selector" title="Cambiar punto de venta activo">
            <Store size={20} color="var(--primary-color)" />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '180px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                📍 Sucursal Activa:
              </span>
              <select
                className="express-branch-select"
                value={activeBranch?.id || ''}
                onChange={(e) => {
                  const selected = branches.find(b => b.id === e.target.value);
                  handleSelectBranch(selected);
                }}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* VISTA CAJERO / COLABORADOR: Sucursal bloqueada y fijada por el admin */
          <div className="express-branch-locked-badge" title="Sucursal asignada por administración">
            <Lock size={16} color="#10b981" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700 }}>
                📍 Sucursal Asignada:
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                {activeBranch?.name || assignedBranchName || 'Punto Asignado'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 2. PESTAÑAS DE NAVEGACIÓN SEGÚN ROL */}
      <nav className="express-nav-tabs">
        {/* Pestaña siempre disponible para Cajero y Admin: Venta POS */}
        <button
          type="button"
          className={`express-tab-btn ${activeTab === 'VENTA' ? 'active' : ''}`}
          onClick={() => setActiveTab('VENTA')}
        >
          <Zap size={18} />
          <span>Venta Rápida (POS)</span>
        </button>

        {/* Pestañas EXCLUSIVAS para Administradores (Inventario, Cierre, Configurar Sopas, Sucursales) */}
        {isAdmin && (
          <>
            <button
              type="button"
              className={`express-tab-btn ${activeTab === 'INVENTARIO' ? 'active' : ''}`}
              onClick={() => setActiveTab('INVENTARIO')}
            >
              <Package size={18} />
              <span>Inventario Diario</span>
              {session?.status === 'OPEN' && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              )}
            </button>

            <button
              type="button"
              className={`express-tab-btn ${activeTab === 'CIERRE' ? 'active' : ''}`}
              onClick={() => setActiveTab('CIERRE')}
            >
              <Calculator size={18} />
              <span>Cierre y Finanzas</span>
            </button>

            <button
              type="button"
              className={`express-tab-btn ${activeTab === 'SOPAS' ? 'active' : ''}`}
              onClick={() => setActiveTab('SOPAS')}
            >
              <Palette size={18} />
              <span>Configurar Sopas</span>
            </button>

            <button
              type="button"
              className={`express-tab-btn ${activeTab === 'SUCURSALES' ? 'active' : ''}`}
              onClick={() => setActiveTab('SUCURSALES')}
            >
              <Store size={18} />
              <span>Sucursales ({branches.length})</span>
            </button>
          </>
        )}
      </nav>

      {/* 3. VISTAS ACTIVAS PROTEGIDAS */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'VENTA' && (
          <ExpressVenta
            activeBranch={activeBranch}
            soups={soups}
            session={session}
            isAdmin={isAdmin}
            onSessionUpdate={setSession}
            onOpenInventoryTab={isAdmin ? () => setActiveTab('INVENTARIO') : null}
          />
        )}

        {/* Pestañas a las que el cajero NUNCA tiene acceso */}
        {isAdmin && activeTab === 'INVENTARIO' && (
          <ExpressInventario
            activeBranch={activeBranch}
            branches={branches}
            onSelectBranch={handleSelectBranch}
            isAdmin={isAdmin}
            soups={soups}
            session={session}
            onSessionUpdate={setSession}
          />
        )}

        {isAdmin && activeTab === 'CIERRE' && (
          <ExpressCierre
            activeBranch={activeBranch}
            branches={branches}
            onSelectBranch={handleSelectBranch}
            soups={soups}
            session={session}
            onSessionUpdate={setSession}
          />
        )}

        {isAdmin && activeTab === 'SOPAS' && (
          <ExpressConfigSopas
            onSoupsChanged={setSoups}
          />
        )}

        {isAdmin && activeTab === 'SUCURSALES' && (
          <ExpressSucursales
            activeBranch={activeBranch}
            onSelectBranch={handleSelectBranch}
            onBranchesChanged={setBranches}
          />
        )}
      </main>
    </div>
  );
}
