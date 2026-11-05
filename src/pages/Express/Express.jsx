import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Zap, Package, Calculator, Palette, Store, ChefHat, RefreshCw } from 'lucide-react';
import './Express.css';

import ExpressVenta from './ExpressVenta';
import ExpressInventario from './ExpressInventario';
import ExpressCierre from './ExpressCierre';
import ExpressConfigSopas from './ExpressConfigSopas';
import ExpressSucursales from './ExpressSucursales';

export default function Express() {
  const [activeTab, setActiveTab] = useState('VENTA'); // 'VENTA' | 'INVENTARIO' | 'CIERRE' | 'SOPAS' | 'SUCURSALES'
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [soups, setSoups] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Cargar sucursales y sopas al iniciar
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Cargar sucursales
      const bSnap = await getDocs(collection(db, 'express_branches'));
      const bList = [];
      bSnap.forEach(d => bList.push({ id: d.id, ...d.data() }));
      bList.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(bList);

      // Restaurar sucursal guardada en localStorage o seleccionar la primera
      const savedBranchId = localStorage.getItem('sopota_express_active_branch');
      const foundBranch = bList.find(b => b.id === savedBranchId) || bList[0] || null;
      setActiveBranch(foundBranch);

      // Cargar sopas
      const sSnap = await getDocs(collection(db, 'express_soups'));
      const sList = [];
      sSnap.forEach(d => sList.push({ id: d.id, ...d.data() }));
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
      {/* 1. TOP HEADER CON MARCA Y SELECTOR RÁPIDO DE SUCURSAL */}
      <header className="express-header">
        <div className="express-brand">
          <ChefHat size={28} color="var(--primary-color)" />
          <h1 className="express-brand-title">
            La Sopota Express
            <span className="express-badge-fast">⚡ Rápido</span>
          </h1>
        </div>

        {/* SELECTOR RÁPIDO DE SUCURSAL */}
        <div className="express-branch-selector">
          <Store size={18} color="var(--primary-color)" />
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
      </header>

      {/* 2. PESTAÑAS DE NAVEGACIÓN (Touch & Mobile Friendly) */}
      <nav className="express-nav-tabs">
        <button
          type="button"
          className={`express-tab-btn ${activeTab === 'VENTA' ? 'active' : ''}`}
          onClick={() => setActiveTab('VENTA')}
        >
          <Zap size={18} />
          <span>Venta Rápida (POS)</span>
        </button>

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
      </nav>

      {/* 3. VISTAS ACTIVAS */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'VENTA' && (
          <ExpressVenta
            activeBranch={activeBranch}
            soups={soups}
            session={session}
            onSessionUpdate={setSession}
            onOpenInventoryTab={() => setActiveTab('INVENTARIO')}
          />
        )}

        {activeTab === 'INVENTARIO' && (
          <ExpressInventario
            activeBranch={activeBranch}
            soups={soups}
            session={session}
            onSessionUpdate={setSession}
          />
        )}

        {activeTab === 'CIERRE' && (
          <ExpressCierre
            activeBranch={activeBranch}
            soups={soups}
            session={session}
            onSessionUpdate={setSession}
          />
        )}

        {activeTab === 'SOPAS' && (
          <ExpressConfigSopas
            onSoupsChanged={setSoups}
          />
        )}

        {activeTab === 'SUCURSALES' && (
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
