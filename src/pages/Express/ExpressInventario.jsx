import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Package, Play, Plus, RefreshCw, AlertCircle, CheckCircle2, ArrowUpRight, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExpressInventario({ activeBranch, branches = [], onSelectBranch, isAdmin = false, soups, session, onSessionUpdate }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialStocks, setInitialStocks] = useState({});
  const [initialCash, setInitialCash] = useState('0');
  
  // Modal / Quick Restock state
  const [restockSoup, setRestockSoup] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const sessionId = activeBranch ? `${activeBranch.id}_${todayStr}` : null;

  useEffect(() => {
    if (soups && soups.length > 0) {
      const init = {};
      soups.forEach(s => {
        init[s.id] = initialStocks[s.id] !== undefined ? initialStocks[s.id] : 20; // default 20 unidades
      });
      setInitialStocks(prev => ({ ...init, ...prev }));
    }
  }, [soups]);

  const handleStockInputChange = (soupId, value) => {
    const val = parseInt(value, 10);
    setInitialStocks(prev => ({
      ...prev,
      [soupId]: isNaN(val) ? 0 : Math.max(0, val)
    }));
  };

  const handleOpenDay = async (e) => {
    e.preventDefault();
    if (!activeBranch) return toast.error('Selecciona una sucursal primero');
    if (!sessionId) return;

    setLoading(true);
    try {
      const stockMap = {};
      soups.forEach(s => {
        stockMap[s.id] = initialStocks[s.id] || 0;
      });

      const sessionData = {
        id: sessionId,
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        date: todayStr,
        status: 'OPEN',
        openedAt: serverTimestamp(),
        openedBy: currentUser?.email || 'cajero',
        initialStock: stockMap,
        currentStock: stockMap,
        soldCount: {},
        totalSales: 0,
        totalCash: 0,
        totalTransfer: 0,
        initialCash: parseFloat(initialCash) || 0
      };

      await setDoc(doc(db, 'express_sessions', sessionId), sessionData);
      toast.success(`¡Día e inventario aperturado para ${activeBranch.name}!`);
      if (onSessionUpdate) onSessionUpdate(sessionData);
    } catch (err) {
      console.error('Error al aperturar sesión:', err);
      toast.error('Error al aperturar el día');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestock = async (e) => {
    e.preventDefault();
    if (!restockSoup) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) return toast.error('Ingresa una cantidad válida mayor a 0');

    setIsRestocking(true);
    try {
      const currentVal = session.currentStock?.[restockSoup.id] || 0;
      const initialVal = session.initialStock?.[restockSoup.id] || 0;
      const newCurrent = currentVal + qty;
      const newInitial = initialVal + qty;

      const sessionRef = doc(db, 'express_sessions', sessionId);
      await updateDoc(sessionRef, {
        [`currentStock.${restockSoup.id}`]: newCurrent,
        [`initialStock.${restockSoup.id}`]: newInitial,
        updatedAt: serverTimestamp()
      });

      toast.success(`Se agregaron +${qty} unidades de ${restockSoup.name}`);
      setRestockSoup(null);
      setRestockQty('');
      if (onSessionUpdate) {
        onSessionUpdate({
          ...session,
          currentStock: { ...session.currentStock, [restockSoup.id]: newCurrent },
          initialStock: { ...session.initialStock, [restockSoup.id]: newInitial }
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar inventario');
    } finally {
      setIsRestocking(false);
    }
  };

  if (!activeBranch) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Package size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <p>Por favor selecciona una sucursal para gestionar su inventario.</p>
      </div>
    );
  }

  const isSessionOpen = session && session.status === 'OPEN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={26} /> Inventario Diario ({activeBranch.name})
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Fecha de hoy: <strong>{todayStr}</strong> | Estado: {' '}
            <span style={{ color: isSessionOpen ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>
              {isSessionOpen ? '● DÍA ABIERTO (En Ventas)' : '○ SIN APERTURA HOY'}
            </span>
          </p>
        </div>

        {/* SELECTOR RÁPIDO DE SUCURSAL PARA ADMINISTRADOR */}
        {isAdmin && branches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', border: '1.5px solid #f97316', padding: '0.35rem 0.85rem', borderRadius: '20px' }}>
            <Store size={16} color="#f97316" />
            <select
              className="input-field"
              value={activeBranch?.id || ''}
              onChange={(e) => {
                const b = branches.find(item => item.id === e.target.value);
                if (b && onSelectBranch) onSelectBranch(b);
              }}
              style={{ border: 'none', background: 'transparent', color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id} style={{ background: '#1e293b' }}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CASO 1: NO HAY SESIÓN ABIERTA -> FORMULARIO DE APERTURA */}
      {!isSessionOpen ? (
        <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: '#f59e0b' }}>
            <AlertCircle size={28} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Apertura de Inventario del Día</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Ingresa cuántas unidades de cada sopa tienes listas para vender hoy en esta sucursal.
              </span>
            </div>
          </div>

          <form onSubmit={handleOpenDay} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {soups.filter(s => s.active !== false).map(soup => (
                <div
                  key={soup.id}
                  style={{
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    borderLeft: `5px solid ${soup.bgColor || '#E65100'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{soup.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>L. {Number(soup.price).toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Unidades:</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      style={{ width: '100%', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}
                      value={initialStocks[soup.id] ?? 0}
                      onChange={e => handleStockInputChange(soup.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Fondo Inicial de Caja en Efectivo (Opcional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>L.</span>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={initialCash}
                  onChange={e => setInitialCash(e.target.value)}
                  style={{ width: '160px', fontWeight: 'bold', fontSize: '1.1rem' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sencillo para dar cambio al inicio</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '1rem 1.5rem',
                fontSize: '1.15rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              <Play size={22} />
              {loading ? 'Aperturando...' : 'Abrir Día e Iniciar Inventario'}
            </button>
          </form>
        </div>
      ) : (
        /* CASO 2: SESIÓN ABIERTA -> MONITOREO Y REABASTECIMIENTO EN VIVO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 color="#22c55e" size={24} />
            <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              <strong>Inventario en tiempo real sincronizado.</strong> Con cada venta realizada en el POS de esta sucursal, el stock disponible se descuenta automáticamente.
            </div>
          </div>

          <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem' }}>SOPA</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>INICIAL</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>VENDIDAS HOY</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>DISPONIBLES</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {soups.map(s => {
                  const initial = session.initialStock?.[s.id] || 0;
                  const current = session.currentStock?.[s.id] ?? initial;
                  const sold = initial - current > 0 ? initial - current : (session.soldCount?.[s.id] || 0);
                  const isLow = current <= 5;
                  const isZero = current <= 0;

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            backgroundColor: s.bgColor || '#E65100',
                            flexShrink: 0
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{s.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>L. {Number(s.price).toFixed(2)}</div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        {initial}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#f97316', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        {sold}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '1rem',
                            backgroundColor: isZero ? 'rgba(239, 68, 68, 0.2)' : isLow ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: isZero ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e'
                          }}
                        >
                          {current} {isZero ? '(Agotado)' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            setRestockSoup(s);
                            setRestockQty('10');
                          }}
                        >
                          <Plus size={14} /> Reabastecer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL REABASTECER SOPA */}
      {restockSoup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ background: 'var(--surface-color)', maxWidth: '400px', width: '100%', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Reabastecer Sopa</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Agrega unidades enviadas desde la cocina central para: <strong>{restockSoup.name}</strong>
            </p>

            <form onSubmit={handleQuickRestock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Cantidad a Agregar (+):
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {[5, 10, 15, 20].map(q => (
                  <button
                    key={q}
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                    onClick={() => setRestockQty(q.toString())}
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={isRestocking}
                >
                  {isRestocking ? 'Guardando...' : 'Confirmar Ingreso'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRestockSoup(null)}
                  style={{ padding: '0.75rem' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
