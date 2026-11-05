import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Zap, ShoppingBag, Trash2, Plus, Minus, Check, Banknote, CreditCard, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QUICK_CASH_OPTIONS = [100, 200, 500, 1000];
const BANKS = ['Banco Atlántida', 'BAC Credomatic', 'Ficohsa', 'Banpaís', 'Davivienda', 'Occidente'];

export default function ExpressVenta({ activeBranch, soups, session, onSessionUpdate, onOpenInventoryTab }) {
  const { currentUser } = useAuth();
  
  // Cart / Ticket state
  const [ticketItems, setTicketItems] = useState([]); // [{ soupId, name, price, qty, bgColor }]
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO'); // Default EFECTIVO
  const [selectedBank, setSelectedBank] = useState('Banco Atlántida');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);

  // Totales
  const totalAmount = ticketItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalItemsCount = ticketItems.reduce((acc, item) => acc + item.qty, 0);

  // Cambio
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, numCashReceived - totalAmount);

  // Agregar sopa al ticket con 1 clic en la tarjeta
  const handleAddSoup = (soup) => {
    // Verificar stock si hay sesión abierta
    const availableStock = session?.currentStock?.[soup.id];
    if (session && session.status === 'OPEN' && availableStock !== undefined && availableStock <= 0) {
      toast.warning(`¡Atención! "${soup.name}" está marcada como agotada en el inventario.`, {
        description: 'Puedes agregarla si la cocina trajo más, pero recuerda reabastecer en Inventario.'
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
          bgColor: soup.bgColor || '#E65100'
        }];
      }
    });

    // Pequeño feedback táctil
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
      return toast.error('El ticket está vacío. Toca una sopa para agregarla.');
    }
    if (!activeBranch) {
      return toast.error('Selecciona una sucursal primero.');
    }

    setIsProcessing(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionId = session?.id || `${activeBranch.id}_${todayStr}`;

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
          bgColor: item.bgColor
        })),
        total: totalAmount,
        totalQty: totalItemsCount,
        paymentMethod: paymentMethod, // 'EFECTIVO' o 'TRANSFERENCIA'
        bank: paymentMethod === 'TRANSFERENCIA' ? selectedBank : null,
        cashReceived: paymentMethod === 'EFECTIVO' ? (numCashReceived > 0 ? numCashReceived : totalAmount) : null,
        change: paymentMethod === 'EFECTIVO' && numCashReceived > totalAmount ? changeDue : 0,
        createdBy: currentUser?.email || 'cajero_express',
        status: 'COMPLETED'
      };

      // 1. Guardar la venta en express_sales
      const saleDocRef = await addDoc(collection(db, 'express_sales'), salePayload);

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
          ? `Cambio a entregar: L. ${changeDue.toFixed(2)}`
          : 'Ticket registrado correctamente.',
        duration: 3500
      });

      // Resetear ticket
      setTicketItems([]);
      setCashReceived('');
      setMobileTicketOpen(false);
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
              Toca los recuadros de sopas para agregarlas a la orden
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

        {/* SI ES EFECTIVO -> OPCIONAL PARA CALCULAR CAMBIO RÁPIDO */}
        {paymentMethod === 'EFECTIVO' && totalAmount > 0 && (
          <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563' }}>Pago con billete de:</span>
              {numCashReceived > totalAmount && (
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>
                  Cambio: L. {changeDue.toFixed(2)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: cashReceived === totalAmount.toString() ? '#e5e7eb' : 'white' }}
                onClick={() => setCashReceived(totalAmount.toString())}
              >
                Exacto
              </button>
              {QUICK_CASH_OPTIONS.map(val => (
                <button
                  key={val}
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: cashReceived === val.toString() ? '#e5e7eb' : 'white' }}
                  onClick={() => setCashReceived(val.toString())}
                >
                  L.{val}
                </button>
              ))}
            </div>
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

      {/* 2. RECUADROS GRANDES DE SOPAS */}
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
                El inventario inicial de hoy para <strong>{activeBranch?.name}</strong> no ha sido iniciado.
              </span>
            </div>
            {onOpenInventoryTab && (
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

        {/* GRID DE SOPAS CON RECUADROS GRANDES */}
        <div className="express-soup-grid">
          {soups.filter(s => s.active !== false).map(soup => {
            const curStock = session?.currentStock?.[soup.id];
            const isOutOfStock = session && session.status === 'OPEN' && curStock !== undefined && curStock <= 0;
            const isLowStock = session && session.status === 'OPEN' && curStock !== undefined && curStock > 0 && curStock <= 5;

            return (
              <div
                key={soup.id}
                className={`express-soup-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                style={{
                  backgroundColor: soup.bgColor || '#E65100',
                  color: '#ffffff'
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

                <div className="express-soup-name">{soup.name}</div>
                <div className="express-soup-price-tag">
                  L. {Number(soup.price).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BARRA FLOTANTE MÓVIL (Sticky Bottom en Teléfonos) */}
      <div className="express-mobile-bar">
        <div
          className="express-mobile-cart-preview"
          onClick={() => setMobileTicketOpen(true)}
        >
          <span className="express-mobile-cart-count">
            🛒 {totalItemsCount} {totalItemsCount === 1 ? 'sopa' : 'sopas'} (Ver Ticket)
          </span>
          <span className="express-mobile-cart-total">
            L. {totalAmount.toFixed(2)}
          </span>
        </div>

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

      {/* 4. MODAL / DRAWER TICKET EN TELÉFONO */}
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
