import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Package, Play, Plus, RefreshCw, AlertCircle, CheckCircle2, ArrowUpRight, Store, UtensilsCrossed, Coffee, ArrowLeftRight, Trash2 } from 'lucide-react';
import ExpressTrasladoModal from './ExpressTrasladoModal';
import { clearBranchInventoryAndTests } from './expressResetService';
import { useAuth } from '../../context/AuthContext';
import { isExtraItem } from './ExpressConfigSopas';

export default function ExpressInventario({ activeBranch, branches = [], onSelectBranch, isAdmin = false, soups, session, onSessionUpdate }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialStocks, setInitialStocks] = useState({});
  const [initialCash, setInitialCash] = useState('0');
  const [invFilter, setInvFilter] = useState('ALL'); // 'ALL' | 'SOPAS' | 'EXTRAS'
  const [trasladoModalOpen, setTrasladoModalOpen] = useState(false);
  
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
        openedBy: currentUser?.email || 'admin',
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

  const mainSoups = soups.filter(s => s.active !== false && !isExtraItem(s));
  const extraItems = soups.filter(s => s.active !== false && isExtraItem(s));

  const filteredInventorySoups = soups.filter(s => {
    if (invFilter === 'SOPAS') return !isExtraItem(s);
    if (invFilter === 'EXTRAS') return isExtraItem(s);
    return true;
  });

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* BOTÓN ROJO SOLO ADMIN: LIMPIAR INVENTARIO Y PRUEBAS */}
          {isAdmin && (
            <button
              type="button"
              className="btn-danger"
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#ffffff',
                border: '1.5px solid #ef4444',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)'
              }}
              onClick={async () => {
                await clearBranchInventoryAndTests(activeBranch, onSessionUpdate);
              }}
              title="Reiniciar y borrar inventario y pruebas de hoy para esta sucursal (Exclusivo Administrador)"
            >
              <Trash2 size={16} />
              <span>Limpiar inventario de esta sucursal</span>
            </button>
          )}

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
      </div>

      {/* CASO 1: NO HAY SESIÓN ABIERTA -> FORMULARIO DE APERTURA */}
      {!isSessionOpen ? (
        <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: '#f59e0b' }}>
            <AlertCircle size={28} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Apertura de Inventario del Día</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Ingresa cuántas unidades de cada sopa o extra tienes listas para vender hoy en esta sucursal.
              </span>
            </div>
          </div>

          <form onSubmit={handleOpenDay} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* SECCIÓN SOPAS PRINCIPALES */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-color)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UtensilsCrossed size={18} /> Sopas Principales ({mainSoups.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {mainSoups.map(soup => (
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
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{soup.name}</strong>
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
            </div>

            {/* SECCIÓN EXTRAS Y BEBIDAS */}
            {extraItems.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#38bdf8', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Coffee size={18} /> Extras, Frescos y Complementos ({extraItems.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  {extraItems.map(extra => (
                    <div
                      key={extra.id}
                      style={{
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.85rem 1rem',
                        borderLeft: `5px solid ${extra.bgColor || '#38bdf8'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{extra.name}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>L. {Number(extra.price).toFixed(2)}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Unidades:</label>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{ width: '100%', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}
                          value={initialStocks[extra.id] ?? 0}
                          onChange={e => handleStockInputChange(extra.id, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            {/* PESTAÑAS DE FILTRO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: invFilter === 'ALL' ? '#f97316' : '#1e293b',
                    color: invFilter === 'ALL' ? '#ffffff' : '#94a3b8',
                    border: '1px solid #334155'
                  }}
                  onClick={() => setInvFilter('ALL')}
                >
                  Todos ({soups.length})
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: invFilter === 'SOPAS' ? '#f97316' : '#1e293b',
                    color: invFilter === 'SOPAS' ? '#ffffff' : '#94a3b8',
                    border: '1px solid #334155'
                  }}
                  onClick={() => setInvFilter('SOPAS')}
                >
                  🍲 Solo Sopas ({mainSoups.length})
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: invFilter === 'EXTRAS' ? '#38bdf8' : '#1e293b',
                    color: invFilter === 'EXTRAS' ? '#ffffff' : '#94a3b8',
                    border: '1px solid #334155'
                  }}
                  onClick={() => setInvFilter('EXTRAS')}
                >
                  🥤 Solo Extras/Frescos ({extraItems.length})
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  border: '1.5px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                onClick={() => setTrasladoModalOpen(true)}
              >
                <ArrowLeftRight size={15} /> Traslado de Sopas
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem' }}>PRODUCTO</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>INICIAL</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>VENDIDAS HOY</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>DISPONIBLES</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventorySoups.map(s => {
                  const initial = session.initialStock?.[s.id] || 0;
                  const current = session.currentStock?.[s.id] ?? initial;
                  const sold = initial - current > 0 ? initial - current : (session.soldCount?.[s.id] || 0);
                  const isLow = current <= 5;
                  const isZero = current <= 0;
                  const isExtra = isExtraItem(s);

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: isExtra ? 'rgba(56, 189, 248, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                              color: isExtra ? '#38bdf8' : '#f97316'
                            }}>
                              {isExtra ? 'EXTRA' : 'SOPA'}
                            </span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{s.name}</strong>
                          </div>
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
                            fontSize: '0.95rem',
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

      {/* MODAL TRASLADO DE INVENTARIO */}
      <ExpressTrasladoModal
        isOpen={trasladoModalOpen}
        onClose={() => setTrasladoModalOpen(false)}
        activeBranch={activeBranch}
        branches={branches}
        soups={soups}
        session={session}
        onTransferCompleted={() => {}}
      />

      {/* MODAL REABASTECER PRODUCTO */}
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
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
              Reabastecer {isExtraItem(restockSoup) ? 'Extra / Producto' : 'Sopa'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Agrega unidades enviadas desde la cocina o bodega para: <strong>{restockSoup.name}</strong>
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
