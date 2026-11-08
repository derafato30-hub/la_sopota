import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Zap, ShoppingBag, Plus, Minus, Banknote, CreditCard, X, AlertTriangle, Coffee, UtensilsCrossed, Check, Receipt, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isExtraItem } from './ExpressConfigSopas';
import ExpressGastoModal from './ExpressGastoModal';
import ExpressTrasladoModal from './ExpressTrasladoModal';

const BANKS = ['Banco Atlántida', 'BAC Credomatic', 'Ficohsa', 'Banpaís', 'Davivienda', 'Occidente'];

export default function ExpressVenta({ activeBranch, branches = [], soups, session, isAdmin: propIsAdmin, onSessionUpdate, onOpenInventoryTab }) {
  const { currentUser, userRole, isAdmin: authIsAdmin } = useAuth();
  const roleUpper = (userRole || '').toString().trim().toUpperCase();
  const emailLower = (currentUser?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(
    propIsAdmin !== undefined ? propIsAdmin : (
      authIsAdmin ||
      roleUpper === 'ADMIN' ||
      roleUpper === 'SUPERADMIN' ||
      roleUpper === 'ADMINISTRADOR' ||
      roleUpper === 'OWNER' ||
      emailLower.includes('admin') ||
      emailLower.includes('sopota')
    )
  );
  
  // Cart / Ticket state
  const [ticketItems, setTicketItems] = useState([]); // [{ soupId, name, price, qty, bgColor }]
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO'); // Default EFECTIVO
  const [selectedBank, setSelectedBank] = useState('Banco Atlántida');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);
  const [extrasDrawerOpen, setExtrasDrawerOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [trasladoModalOpen, setTrasladoModalOpen] = useState(false);

  // Clasificación de productos (Sopas principales vs Extras/Frescos)
  const mainSoups = soups.filter(s => s.active !== false && !isExtraItem(s));
  const extraItems = soups.filter(s => s.active !== false && isExtraItem(s));

  // Totales
  const totalAmount = ticketItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalItemsCount = ticketItems.reduce((acc, item) => acc + item.qty, 0);

  // Cantidad de extras actualmente en el ticket
  const extrasInTicketCount = ticketItems
    .filter(item => isExtraItem(item))
    .reduce((acc, item) => acc + item.qty, 0);

  // Cambio
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, numCashReceived - totalAmount);

  // Agregar sopa o extra al ticket con 1 clic en la tarjeta
  const handleAddSoup = (soup) => {
    // Verificar stock si hay sesión abierta
    const availableStock = session?.currentStock?.[soup.id];
    if (session && session.status === 'OPEN' && availableStock !== undefined && availableStock <= 0) {
      toast.warning(`¡Atención! "${soup.name}" está marcada como agotada en el inventario.`, {
        description: isAdmin
          ? 'Puedes agregarla si la cocina trajo más, pero recuerda reabastecer en Inventario.'
          : 'Consulta con el administrador para reabastecer existencias.'
      });
    }

    setTicketItems(prev => {
      const existing = prev.find(item => item.soupId === soup.id);
      if (existing) {
        return prev.map(item =>
          item.soupId === soup.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, {
          soupId: soup.id,
          name: soup.name,
          price: soup.price,
          qty: 1,
          bgColor: soup.bgColor || '#E65100',
          category: soup.category || (isExtraItem(soup) ? 'EXTRA' : 'SOPA')
        }];
      }
    });

    // Pequeño feedback táctil en móviles
    if (navigator.vibrate) navigator.vibrate(40);
  };

  const handleUpdateQty = (soupId, delta) => {
    setTicketItems(prev => {
      return prev
        .map(item => {
          if (item.soupId === soupId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleClearTicket = () => {
    if (ticketItems.length === 0) return;
    setTicketItems([]);
    setCashReceived('');
  };

  // CONFIRMAR VENTA EN 1 CLIC
  const handleConfirmSale = async () => {
    if (ticketItems.length === 0) {
      return toast.error('El ticket está vacío. Toca un producto para agregarlo.');
    }
    if (!activeBranch) {
      return toast.error('Selecciona una sucursal primero.');
    }

    setIsProcessing(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionId = session?.id || `${activeBranch.id}_${todayStr}`;

    const finalCashReceived = paymentMethod === 'EFECTIVO' 
      ? (numCashReceived > 0 ? numCashReceived : totalAmount) 
      : null;
    const finalChange = paymentMethod === 'EFECTIVO' && numCashReceived > totalAmount 
      ? changeDue 
      : 0;

    try {
      const salePayload = {
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        sessionId: sessionId,
        date: serverTimestamp(),
        dateStr: todayStr,
        items: ticketItems.map(item => ({
          soupId: item.soupId,
          name: item.name,
          price: item.price,
          qty: item.qty,
          subtotal: item.price * item.qty,
          bgColor: item.bgColor,
          category: item.category || 'SOPA'
        })),
        total: totalAmount,
        totalQty: totalItemsCount,
        paymentMethod: paymentMethod, // 'EFECTIVO' o 'TRANSFERENCIA'
        bank: paymentMethod === 'TRANSFERENCIA' ? selectedBank : null,
        cashReceived: finalCashReceived,
        change: finalChange,
        createdBy: currentUser?.email || 'cajero_express',
        status: 'COMPLETED'
      };

      // 1. Guardar la venta en express_sales
      await addDoc(collection(db, 'express_sales'), salePayload);

      // 2. Si hay sesión activa en express_sessions, descontar inventario en caliente
      if (session && session.status === 'OPEN') {
        const sessionRef = doc(db, 'express_sessions', session.id);
        const updatedCurrentStock = { ...(session.currentStock || {}) };
        const updatedSoldCount = { ...(session.soldCount || {}) };

        ticketItems.forEach(item => {
          const cur = updatedCurrentStock[item.soupId] ?? (session.initialStock?.[item.soupId] || 0);
          updatedCurrentStock[item.soupId] = Math.max(0, cur - item.qty);
          updatedSoldCount[item.soupId] = (updatedSoldCount[item.soupId] || 0) + item.qty;
        });

        const newTotalSales = (session.totalSales || 0) + totalAmount;
        const newTotalCash = (session.totalCash || 0) + (paymentMethod === 'EFECTIVO' ? totalAmount : 0);
        const newTotalTransfer = (session.totalTransfer || 0) + (paymentMethod === 'TRANSFERENCIA' ? totalAmount : 0);

        await updateDoc(sessionRef, {
          currentStock: updatedCurrentStock,
          soldCount: updatedSoldCount,
          totalSales: newTotalSales,
          totalCash: newTotalCash,
          totalTransfer: newTotalTransfer,
          updatedAt: serverTimestamp()
        });

        if (onSessionUpdate) {
          onSessionUpdate({
            ...session,
            currentStock: updatedCurrentStock,
            soldCount: updatedSoldCount,
            totalSales: newTotalSales,
            totalCash: newTotalCash,
            totalTransfer: newTotalTransfer
          });
        }
      }

      // Feedback de éxito y reseteo inmediato del ticket
      toast.success(`¡Venta Confirmada! L. ${totalAmount.toFixed(2)} (${paymentMethod})`, {
        description: paymentMethod === 'EFECTIVO' && numCashReceived > totalAmount
          ? `Vuelto a entregar: L. ${changeDue.toFixed(2)}`
          : 'Ticket registrado correctamente.',
        duration: 3500
      });

      // Resetear ticket
      setTicketItems([]);
      setCashReceived('');
      setMobileTicketOpen(false);
      setExtrasDrawerOpen(false);
      setPaymentMethod('EFECTIVO'); // Volver a predeterminado
    } catch (err) {
      console.error('Error al registrar venta express:', err);
      toast.error('Error al confirmar la venta. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render del contenido del ticket (utilizado tanto en desktop como en modal mobile)
  const renderTicketContent = (isMobileModal = false) => (
    <>
      <div className="express-ticket-header">
        {isMobileModal && (
          <button
            onClick={() => setMobileTicketOpen(false)}
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <X size={22} />
          </button>
        )}
        <h3>LA SOPOTA EXPRESS</h3>
        <div className="express-ticket-branch">{activeBranch?.name || 'Sucursal Principal'}</div>
      </div>

      <div className="express-ticket-body">
        {ticketItems.length === 0 ? (
          <div className="express-ticket-empty">
            <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <div>Ticket vacío</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>
              Toca los recuadros de sopas o extras para agregarlos a la orden
            </div>
          </div>
        ) : (
          ticketItems.map(item => (
            <div key={item.soupId} className="express-ticket-item">
              <div className="express-ticket-item-info">
                <div className="express-ticket-item-name">{item.name}</div>
                <div className="express-ticket-item-unit">L. {item.price.toFixed(2)} c/u</div>
              </div>

              <div className="express-ticket-item-qty-controls">
                <button
                  type="button"
                  className="express-qty-btn"
                  onClick={() => handleUpdateQty(item.soupId, -1)}
                >
                  <Minus size={14} />
                </button>
                <span className="express-qty-val">{item.qty}</span>
                <button
                  type="button"
                  className="express-qty-btn"
                  onClick={() => handleUpdateQty(item.soupId, 1)}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="express-ticket-item-subtotal">
                L. {(item.price * item.qty).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="express-ticket-footer">
        {/* TOTAL */}
        <div className="express-ticket-total-row">
          <span className="express-ticket-total-label">TOTAL ({totalItemsCount}):</span>
          <span className="express-ticket-total-amount">L. {totalAmount.toFixed(2)}</span>
        </div>

        {/* MÉTODO DE PAGO (PREDETERMINADO EFECTIVO O TRANSFERENCIA) */}
        <div>
          <label style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
            MÉTODO DE PAGO:
          </label>
          <div className="express-pay-methods">
            <button
              type="button"
              className={`express-pay-btn ${paymentMethod === 'EFECTIVO' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('EFECTIVO')}
            >
              <Banknote size={16} /> EFECTIVO
            </button>
            <button
              type="button"
              className={`express-pay-btn ${paymentMethod === 'TRANSFERENCIA' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('TRANSFERENCIA')}
            >
              <CreditCard size={16} /> TRANSFERENCIA
            </button>
          </div>
        </div>

        {/* SI ES TRANSFERENCIA -> SELECCIONAR BANCO */}
        {paymentMethod === 'TRANSFERENCIA' && (
          <div style={{ marginTop: '0.2rem' }}>
            <select
              className="input-field"
              value={selectedBank}
              onChange={e => setSelectedBank(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem', color: '#111827', background: '#f3f4f6' }}
            >
              {BANKS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        {/* SI ES EFECTIVO -> INGRESO DIRECTO DE MONTO PAGADO Y CAMBIO EN VIVO */}
        {paymentMethod === 'EFECTIVO' && (
          <div className="express-cash-section">
            <div className="express-cash-header">
              <label className="express-cash-label">
                <Banknote size={15} /> Efectivo Recibido:
              </label>
              {cashReceived && (
                <button
                  type="button"
                  className="express-cash-clear"
                  onClick={() => setCashReceived('')}
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="express-cash-input-wrap">
              <span className="express-currency-symbol">L.</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder={totalAmount > 0 ? `Ej. ${totalAmount.toFixed(0)} o 500` : '0.00'}
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                className="express-cash-input"
                autoComplete="off"
              />
              <button
                type="button"
                className="express-cash-exact-btn"
                onClick={() => setCashReceived(totalAmount > 0 ? totalAmount.toString() : '')}
                title="Pago con monto exacto"
              >
                Exacto
              </button>
            </div>

            {/* CÁLCULO DE CAMBIO / VUELTO EN TIEMPO REAL */}
            {totalAmount > 0 && numCashReceived > 0 && (
              <div className={`express-cash-change-box ${numCashReceived >= totalAmount ? 'ok' : 'pending'}`}>
                {numCashReceived > totalAmount ? (
                  <>
                    <span className="change-title">CAMBIO / VUELTO:</span>
                    <strong className="change-val">L. {changeDue.toFixed(2)}</strong>
                  </>
                ) : numCashReceived === totalAmount ? (
                  <span className="change-exact">✅ Pago Exacto (Sin vuelto)</span>
                ) : (
                  <span className="change-missing">⚠️ Faltan: L. {(totalAmount - numCashReceived).toFixed(2)}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* BOTÓN CONFIRMAR EN 1-CLIC */}
        <button
          type="button"
          className="express-confirm-btn"
          disabled={ticketItems.length === 0 || isProcessing}
          onClick={handleConfirmSale}
        >
          <Zap size={20} />
          {isProcessing ? 'Procesando...' : `CONFIRMAR VENTA (L. ${totalAmount.toFixed(2)})`}
        </button>

        {ticketItems.length > 0 && (
          <button
            type="button"
            className="express-ticket-clear-btn"
            onClick={handleClearTicket}
          >
            Vaciar Ticket
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="express-sale-layout">
      {/* 1. TICKET PANEL A LA IZQUIERDA (Desktop / Tablet) */}
      <div className="express-ticket-panel hide-on-mobile">
        {renderTicketContent(false)}
      </div>

      {/* 2. CONTENEDOR DE PRODUCTOS (SOPAS GRANDES + BOTÓN DE EXTRAS Y GASTOS) */}
      <div className="express-soup-container">
        {/* Alerta si el día no ha sido aperturado en inventario */}
        {(!session || session.status !== 'OPEN') && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
              <AlertTriangle size={20} />
              <span style={{ fontSize: '0.9rem' }}>
                {isAdmin ? (
                  <>El inventario inicial de hoy para <strong>{activeBranch?.name}</strong> no ha sido iniciado.</>
                ) : (
                  <>El inventario de hoy para <strong>{activeBranch?.name}</strong> aún no ha sido aperturado por el Administrador. Solicita a administración la apertura de existencias.</>
                )}
              </span>
            </div>
            {isAdmin && onOpenInventoryTab && (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                onClick={onOpenInventoryTab}
              >
                Abrir Inventario
              </button>
            )}
          </div>
        )}

        {/* BARRA SUPERIOR: ENCABEZADO DE SOPAS, BOTÓN DE GASTOS Y BOTÓN DE EXTRAS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.2rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UtensilsCrossed size={20} color="var(--primary-color)" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
              Sopas Disponibles ({mainSoups.length})
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* BOTÓN TRASLADO DE SOPAS */}
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#38bdf8',
                border: '1.5px solid #38bdf8',
                background: 'rgba(56, 189, 248, 0.14)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              onClick={() => setTrasladoModalOpen(true)}
              title="Trasladar sopas hacia otra sucursal o devolver a Cocina Central (L. 0.00)"
            >
              <ArrowLeftRight size={17} />
              <span>Trasladar Sopas</span>
            </button>
            {/* BOTÓN REGISTRAR GASTO DE SUCURSAL */}
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#f43f5e',
                border: '1.5px solid #f43f5e',
                background: 'rgba(244, 63, 94, 0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              onClick={() => setExpenseModalOpen(true)}
              title="Registrar salida de dinero o gasto operativo de esta sucursal"
            >
              <Receipt size={17} />
              <span>Gasto de Caja</span>
            </button>

            {/* BOTÓN DESPLEGABLE DE EXTRAS Y FRESCOS */}
            {extraItems.length > 0 && (
              <button
                type="button"
                className={`express-open-extras-btn ${extrasInTicketCount > 0 ? 'has-items' : ''}`}
                onClick={() => setExtrasDrawerOpen(true)}
                title="Abrir menú de bebidas, extras y complementos"
              >
                <Coffee size={18} />
                <span>Extras y Frescos ({extraItems.length})</span>
                {extrasInTicketCount > 0 && (
                  <span className="express-extras-ticket-pill">
                    {extrasInTicketCount} en ticket
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* GRID DE SOPAS PRINCIPALES CON RECUADROS GRANDES */}
        {mainSoups.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '14px' }}>
            No hay sopas principales activas. Puedes configurarlas en la pestaña <strong>Configurar Sopas</strong>.
          </div>
        ) : (
          <div className="express-soup-grid">
            {mainSoups.map(soup => {
              const curStock = session?.currentStock?.[soup.id];
              const isOutOfStock = session && session.status === 'OPEN' && curStock !== undefined && curStock <= 0;
              const isLowStock = session && session.status === 'OPEN' && curStock !== undefined && curStock > 0 && curStock <= 5;
              const inTicket = ticketItems.find(it => it.soupId === soup.id);

              return (
                <div
                  key={soup.id}
                  className={`express-soup-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  style={{
                    backgroundColor: soup.bgColor || '#E65100',
                    color: '#ffffff',
                    boxShadow: inTicket ? '0 0 0 3px #22c55e, 0 8px 20px rgba(0,0,0,0.5)' : undefined
                  }}
                  onClick={() => handleAddSoup(soup)}
                  title={`Agregar 1 ${soup.name}`}
                >
                  {/* BADGE DE STOCK DISPONIBLE */}
                  {session && session.status === 'OPEN' && curStock !== undefined && (
                    <div className={`express-soup-stock-badge ${isOutOfStock || isLowStock ? 'low' : ''}`}>
                      {isOutOfStock ? 'AGOTADO' : `${curStock} disp.`}
                    </div>
                  )}

                  {inTicket && (
                    <div style={{
                      position: 'absolute',
                      top: '0.6rem',
                      left: '0.6rem',
                      background: '#22c55e',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.4)'
                    }}>
                      ✓ {inTicket.qty} en orden
                    </div>
                  )}

                  <div className="express-soup-name" style={{ marginTop: inTicket ? '1.5rem' : '0.5rem' }}>
                    {soup.name}
                  </div>
                  <div className="express-soup-price-tag">
                    L. {Number(soup.price).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MODAL / DRAWER DE EXTRAS Y FRESCOS DESPLEGABLE */}
      {extrasDrawerOpen && (
        <>
          <div className="express-drawer-overlay" onClick={() => setExtrasDrawerOpen(false)} />
          <div className="express-extras-drawer">
            <div className="express-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Coffee size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                    Extras, Frescos y Complementos
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Toca cualquier producto para sumarlo a la orden actual
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="express-drawer-close-btn"
                onClick={() => setExtrasDrawerOpen(false)}
                title="Cerrar panel de extras"
              >
                <X size={20} />
              </button>
            </div>

            <div className="express-drawer-body">
              {extraItems.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No hay extras registrados.
                </div>
              ) : (
                <div className="express-extras-grid">
                  {extraItems.map(extra => {
                    const inTicket = ticketItems.find(it => it.soupId === extra.id);
                    const curStock = session?.currentStock?.[extra.id];
                    const isOutOfStock = session && session.status === 'OPEN' && curStock !== undefined && curStock <= 0;

                    return (
                      <div
                        key={extra.id}
                        className={`express-extra-card ${inTicket ? 'in-ticket' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                        style={{
                          backgroundColor: extra.bgColor || '#334155',
                          color: '#ffffff'
                        }}
                        onClick={() => handleAddSoup(extra)}
                      >
                        {inTicket && (
                          <div className="express-extra-in-ticket-badge">
                            ✓ {inTicket.qty} en orden
                          </div>
                        )}
                        {session && session.status === 'OPEN' && curStock !== undefined && (
                          <div className="express-extra-stock-badge">
                            {isOutOfStock ? 'AGOTADO' : `${curStock} disp.`}
                          </div>
                        )}
                        <div className="express-extra-name" style={{ marginTop: inTicket ? '1.2rem' : '0' }}>
                          {extra.name}
                        </div>
                        <div className="express-extra-price">
                          L. {Number(extra.price).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="express-drawer-footer">
              <div className="express-drawer-footer-info">
                <span>Items en orden: <strong style={{ color: '#ffffff' }}>{totalItemsCount}</strong></span>
                <span>Total de venta: <strong style={{ color: '#ea580c', fontSize: '1.15rem' }}>L. {totalAmount.toFixed(2)}</strong></span>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.75rem 1.4rem', fontWeight: 800, fontSize: '0.95rem', borderRadius: '10px' }}
                onClick={() => setExtrasDrawerOpen(false)}
              >
                <Check size={18} /> Listo / Volver a Sopas
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. MODAL PARA REGISTRAR GASTO DE SUCURSAL */}
      <ExpressGastoModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        activeBranch={activeBranch}
      />

      {/* MODAL TRASLADO DE SOPAS */}
      <ExpressTrasladoModal
        isOpen={trasladoModalOpen}
        onClose={() => setTrasladoModalOpen(false)}
        activeBranch={activeBranch}
        branches={branches}
        soups={soups}
        session={session}
        onTransferCompleted={() => {}}
      />

      {/* 5. BARRA FLOTANTE MÓVIL (Sticky Bottom en Teléfonos) */}
      <div className="express-mobile-bar">
        <div
          className="express-mobile-cart-preview"
          onClick={() => setMobileTicketOpen(true)}
        >
          <span className="express-mobile-cart-count">
            🛒 {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} (Ver Ticket)
          </span>
          <span className="express-mobile-cart-total">
            L. {totalAmount.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{
            padding: '0.65rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 800,
            background: '#1e293b',
            color: '#f43f5e',
            border: '1.5px solid #f43f5e'
          }}
          onClick={() => setExpenseModalOpen(true)}
          title="Registrar gasto"
        >
          💸 Gasto
        </button>



        {extraItems.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              background: '#1e293b',
              color: '#38bdf8',
              border: '1.5px solid #38bdf8'
            }}
            onClick={() => setExtrasDrawerOpen(true)}
          >
            🥤 Extras {extrasInTicketCount > 0 ? `(${extrasInTicketCount})` : ''}
          </button>
        )}

        <button
          type="button"
          className="express-mobile-confirm-btn"
          disabled={ticketItems.length === 0 || isProcessing}
          onClick={handleConfirmSale}
        >
          <Zap size={18} />
          {isProcessing ? '...' : `Cobrar L.${totalAmount.toFixed(0)} (${paymentMethod === 'EFECTIVO' ? 'Efect.' : 'Transf.'})`}
        </button>
      </div>

      {/* 6. MODAL / DRAWER TICKET EN TELÉFONO */}
      {mobileTicketOpen && (
        <>
          <div className="express-mobile-overlay" onClick={() => setMobileTicketOpen(false)} />
          <div className="express-ticket-panel mobile-open">
            {renderTicketContent(true)}
          </div>
        </>
      )}
    </div>
  );
}
