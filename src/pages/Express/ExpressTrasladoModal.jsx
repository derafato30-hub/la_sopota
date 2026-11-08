import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { ArrowLeftRight, Store, Building2, Plus, Minus, X, Check, Trash2, History, AlertCircle, Info, Coffee, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isExtraItem } from './ExpressConfigSopas';

export default function ExpressTrasladoModal({
  isOpen,
  onClose,
  activeBranch,
  branches = [],
  soups = [],
  session,
  onTransferCompleted
}) {
  const { currentUser } = useAuth();
  const [modalTab, setModalTab] = useState('NEW'); // 'NEW' | 'HISTORY'
  const [destBranchId, setDestBranchId] = useState('');
  const [quantities, setQuantities] = useState({}); // { [soupId]: number }
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'SOPAS' | 'EXTRAS'

  // Historial de traslados de hoy para esta sucursal
  const [todayTransfers, setTodayTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isOriginUnlimited = session?.unlimitedInventory || session?.inventoryMode === 'UNLIMITED';

  // Opciones de destino: Otras sucursales + Cocina Central
  const otherBranches = (branches || []).filter(b => b.id !== activeBranch?.id);

  useEffect(() => {
    if (isOpen) {
      // Auto-seleccionar primer destino por defecto si no hay uno seleccionado
      if (!destBranchId || destBranchId === activeBranch?.id) {
        if (otherBranches.length > 0) {
          setDestBranchId(otherBranches[0].id);
        } else {
          setDestBranchId('CENTRAL');
        }
      }
      fetchTodayTransfers();
    }
  }, [isOpen, activeBranch, branches]);

  const fetchTodayTransfers = async () => {
    if (!activeBranch) return;
    setLoadingTransfers(true);
    try {
      const q = query(
        collection(db, 'express_transfers'),
        where('dateStr', '==', todayStr)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.originBranchId === activeBranch.id || data.destinationBranchId === activeBranch.id) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setTodayTransfers(list);
    } catch (err) {
      console.error('Error al cargar traslados de hoy:', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleQtyChange = (soupId, delta, maxAvailable) => {
    setQuantities(prev => {
      const cur = prev[soupId] || 0;
      let next = cur + delta;
      if (next < 0) next = 0;
      if (maxAvailable !== undefined && next > maxAvailable) {
        next = maxAvailable;
        toast.warning(`Cantidad limitada al stock disponible (${maxAvailable})`);
      }
      return { ...prev, [soupId]: next };
    });
  };

  const handleSetMax = (soupId, maxAvailable) => {
    if (!maxAvailable || maxAvailable <= 0) return;
    setQuantities(prev => ({
      ...prev,
      [soupId]: maxAvailable
    }));
  };

  const handleManualInput = (soupId, valStr, maxAvailable) => {
    const val = parseInt(valStr, 10);
    let qty = isNaN(val) ? 0 : Math.max(0, val);
    if (maxAvailable !== undefined && qty > maxAvailable) {
      qty = maxAvailable;
      toast.warning(`Cantidad limitada al stock disponible (${maxAvailable})`);
    }
    setQuantities(prev => ({
      ...prev,
      [soupId]: qty
    }));
  };

  // Filtrado de productos para la lista
  const filteredSoups = soups.filter(s => {
    if (s.active === false) return false;
    const isExtra = isExtraItem(s);
    if (filterCategory === 'SOPAS') return !isExtra;
    if (filterCategory === 'EXTRAS') return isExtra;
    return true;
  });

  // Total de unidades seleccionadas para trasladar
  const totalUnitsSelected = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);

  // Destino resuelto
  const isCentral = destBranchId === 'CENTRAL';
  const targetBranch = isCentral ? { id: 'CENTRAL', name: 'Cocina Central' } : otherBranches.find(b => b.id === destBranchId);
  const targetName = isCentral ? 'Cocina Central (Regreso de ollas/sobrante)' : (targetBranch?.name || 'Sucursal Destino');

  // CONFIRMAR TRASLADO
  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!activeBranch) return toast.error('No hay sucursal origen activa.');
    if (!destBranchId) return toast.error('Selecciona el punto de destino.');
    if (destBranchId === activeBranch.id) return toast.error('El destino no puede ser la misma sucursal origen.');

    // Validar productos
    const itemsToTransfer = [];
    for (const s of soups) {
      const qty = quantities[s.id] || 0;
      if (qty > 0) {
        if (!isOriginUnlimited && session && session.status === 'OPEN') {
          const available = session?.currentStock?.[s.id] ?? 0;
          if (qty > available) {
            return toast.error(`No puedes trasladar ${qty} de "${s.name}". Solo tienes ${available} disponibles.`);
          }
        }
        itemsToTransfer.push({
          soupId: s.id,
          name: s.name,
          price: s.price || 0,
          qty: qty,
          bgColor: s.bgColor || '#E65100',
          category: s.category || (isExtraItem(s) ? 'EXTRA' : 'SOPA')
        });
      }
    }

    if (itemsToTransfer.length === 0) {
      return toast.error('Selecciona al menos 1 unidad para trasladar.');
    }

    const totalUnits = itemsToTransfer.reduce((sum, item) => sum + item.qty, 0);

    setIsSaving(true);
    try {
      // 1. Registrar documento en colección 'express_transfers'
      const transferPayload = {
        dateStr: todayStr,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'colaborador_express',
        originBranchId: activeBranch.id,
        originBranchName: activeBranch.name,
        destinationBranchId: destBranchId,
        destinationBranchName: targetName,
        isCentral: isCentral,
        items: itemsToTransfer,
        totalUnits: totalUnits,
        notes: notes.trim() || null,
        status: 'COMPLETED'
      };

      await addDoc(collection(db, 'express_transfers'), transferPayload);

      // 2. Actualizar Sesión de Sucursal Origen (Disminuir currentStock, Incrementar transferredOut)
      const originSessionRef = doc(db, 'express_sessions', `${activeBranch.id}_${todayStr}`);
      const originSnap = await getDoc(originSessionRef);

      if (originSnap.exists()) {
        const oData = originSnap.data();
        const oIsUnlimited = oData.unlimitedInventory || oData.inventoryMode === 'UNLIMITED';
        const newCurStock = { ...(oData.currentStock || {}) };
        const newTransferredOut = { ...(oData.transferredOut || {}) };

        itemsToTransfer.forEach(item => {
          if (!oIsUnlimited) {
            newCurStock[item.soupId] = Math.max(0, (newCurStock[item.soupId] || 0) - item.qty);
          }
          newTransferredOut[item.soupId] = (newTransferredOut[item.soupId] || 0) + item.qty;
        });

        const originUpdates = {
          transferredOut: newTransferredOut,
          updatedAt: serverTimestamp()
        };
        if (!oIsUnlimited) {
          originUpdates.currentStock = newCurStock;
        }

        await updateDoc(originSessionRef, originUpdates);
      }

      // 3. Si el destino es otra sucursal, actualizar o preparar su sesión receptora
      if (!isCentral) {
        const destSessionRef = doc(db, 'express_sessions', `${destBranchId}_${todayStr}`);
        const destSnap = await getDoc(destSessionRef);

        if (destSnap.exists()) {
          const dData = destSnap.data();
          const destCurStock = { ...(dData.currentStock || {}) };
          const destTransferredIn = { ...(dData.transferredIn || {}) };

          itemsToTransfer.forEach(item => {
            destCurStock[item.soupId] = (destCurStock[item.soupId] || 0) + item.qty;
            destTransferredIn[item.soupId] = (destTransferredIn[item.soupId] || 0) + item.qty;
          });

          await updateDoc(destSessionRef, {
            currentStock: destCurStock,
            transferredIn: destTransferredIn,
            updatedAt: serverTimestamp()
          });
        } else {
          // Si la sucursal receptora no ha abierto aún hoy, se pre-inicializa su sesión con los productos recibidos
          const destCurStock = {};
          const destTransferredIn = {};
          itemsToTransfer.forEach(item => {
            destCurStock[item.soupId] = item.qty;
            destTransferredIn[item.soupId] = item.qty;
          });

          await setDoc(destSessionRef, {
            id: `${destBranchId}_${todayStr}`,
            branchId: destBranchId,
            branchName: targetName,
            date: todayStr,
            status: 'OPEN',
            initialCash: 0,
            initialStock: {},
            currentStock: destCurStock,
            transferredIn: destTransferredIn,
            transferredOut: {},
            soldCount: {},
            totalSales: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      toast.success(`¡Traslado exitoso! Se enviaron ${totalUnits} unidades a ${targetName}.`, {
        description: 'Las existencias fueron ajustadas en tiempo real sin alterar las ventas monetarias.'
      });

      // Limpiar formulario
      setQuantities({});
      setNotes('');
      fetchTodayTransfers();
      if (onTransferCompleted) onTransferCompleted();
      onClose();
    } catch (err) {
      console.error('Error al realizar traslado:', err);
      toast.error('Error al registrar el traslado de inventario.');
    } finally {
      setIsSaving(false);
    }
  };

  // ANULAR TRASLADO HECHO POR ERROR
  const handleCancelTransfer = async (transfer) => {
    if (!confirm(`¿Confirmas anular el traslado de ${transfer.totalUnits} unidades hacia "${transfer.destinationBranchName}"? Esta acción regresará las unidades al inventario de ${activeBranch.name}.`)) {
      return;
    }

    try {
      // 1. Restaurar existencias en origen
      const originSessionRef = doc(db, 'express_sessions', `${transfer.originBranchId}_${todayStr}`);
      const originSnap = await getDoc(originSessionRef);
      if (originSnap.exists()) {
        const oData = originSnap.data();
        const oIsUnlimited = oData.unlimitedInventory || oData.inventoryMode === 'UNLIMITED';
        const newCurStock = { ...(oData.currentStock || {}) };
        const newTransferredOut = { ...(oData.transferredOut || {}) };

        (transfer.items || []).forEach(item => {
          if (!oIsUnlimited) {
            newCurStock[item.soupId] = (newCurStock[item.soupId] || 0) + (item.qty || 0);
          }
          newTransferredOut[item.soupId] = Math.max(0, (newTransferredOut[item.soupId] || 0) - (item.qty || 0));
        });

        const cancelUpdates = {
          transferredOut: newTransferredOut,
          updatedAt: serverTimestamp()
        };
        if (!oIsUnlimited) {
          cancelUpdates.currentStock = newCurStock;
        }

        await updateDoc(originSessionRef, cancelUpdates);
      }

      // 2. Si el destino era una sucursal, restar las unidades recibidas
      if (!transfer.isCentral && transfer.destinationBranchId) {
        const destSessionRef = doc(db, 'express_sessions', `${transfer.destinationBranchId}_${todayStr}`);
        const destSnap = await getDoc(destSessionRef);
        if (destSnap.exists()) {
          const dData = destSnap.data();
          const destCurStock = { ...(dData.currentStock || {}) };
          const destTransferredIn = { ...(dData.transferredIn || {}) };

          (transfer.items || []).forEach(item => {
            destCurStock[item.soupId] = Math.max(0, (destCurStock[item.soupId] || 0) - (item.qty || 0));
            destTransferredIn[item.soupId] = Math.max(0, (destTransferredIn[item.soupId] || 0) - (item.qty || 0));
          });

          await updateDoc(destSessionRef, {
            currentStock: destCurStock,
            transferredIn: destTransferredIn,
            updatedAt: serverTimestamp()
          });
        }
      }

      // 3. Eliminar documento del traslado
      await deleteDoc(doc(db, 'express_transfers', transfer.id));
      toast.success('Traslado anulado e inventario restaurado.');
      fetchTodayTransfers();
      if (onTransferCompleted) onTransferCompleted();
    } catch (err) {
      console.error('Error al anular traslado:', err);
      toast.error('Error al anular el traslado');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="express-drawer-overlay" onClick={onClose} />
      <div className="express-extras-drawer" style={{ maxWidth: '680px', maxHeight: '90vh' }}>
        {/* HEADER */}
        <div className="express-drawer-header" style={{ background: '#1e293b', borderBottom: '1.5px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #3b82f6'
            }}>
              <ArrowLeftRight size={22} color="#60a5fa" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Traslado de Sopas e Inventario
                <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                  L. 0.00
                </span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Store size={14} color="#f97316" /> Origen: <strong style={{ color: '#ffffff' }}>{activeBranch?.name || 'Punto de Venta'}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="express-drawer-close-btn"
            onClick={onClose}
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUBHEADER: PESTAÑAS (NUEVO TRASLADO VS HISTORIAL) */}
        <div style={{
          display: 'flex',
          background: '#0f172a',
          padding: '0.5rem 1.25rem',
          borderBottom: '1px solid #334155',
          gap: '0.5rem',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                borderRadius: '8px',
                background: modalTab === 'NEW' ? '#3b82f6' : '#1e293b',
                color: modalTab === 'NEW' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => setModalTab('NEW')}
            >
              <Plus size={16} /> Nuevo Traslado
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                borderRadius: '8px',
                background: modalTab === 'HISTORY' ? '#3b82f6' : '#1e293b',
                color: modalTab === 'HISTORY' ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => {
                setModalTab('HISTORY');
                fetchTodayTransfers();
              }}
            >
              <History size={16} /> Movimientos de Hoy ({todayTransfers.length})
            </button>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
            📦 Movimiento Logístico Interno
          </span>
        </div>

        {/* BODY */}
        <div className="express-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {modalTab === 'NEW' ? (
            /* TAB 1: FORMULARIO DE TRASLADO */
            <form onSubmit={handleConfirmTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* NOTA ACLARATORIA */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem'
              }}>
                <Info size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.35' }}>
                  <strong>Cero impacto en finanzas:</strong> El traslado descuenta las existencias de este punto y las suma al destino. <strong>No suma dinero a la venta ni afecta el cuadre en efectivo ni bancos</strong>.
                </div>
              </div>

              {/* SELECCIÓN DE DESTINO */}
              <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
                  <Store size={16} color="#60a5fa" /> Punto de Destino (Hacia dónde van las sopas):
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {/* OPCIÓN: OTRAS SUCURSALES */}
                  {otherBranches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      style={{
                        padding: '0.7rem 0.9rem',
                        borderRadius: '10px',
                        border: destBranchId === b.id ? '2px solid #3b82f6' : '1px solid #475569',
                        background: destBranchId === b.id ? 'rgba(59, 130, 246, 0.2)' : '#0f172a',
                        color: destBranchId === b.id ? '#ffffff' : '#94a3b8',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setDestBranchId(b.id)}
                    >
                      <strong style={{ fontSize: '0.9rem', color: destBranchId === b.id ? '#ffffff' : '#e2e8f0' }}>
                        📍 {b.name}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: destBranchId === b.id ? '#93c5fd' : '#64748b' }}>
                        Sucursal / Punto de Venta
                      </span>
                    </button>
                  ))}

                  {/* OPCIÓN: COCINA CENTRAL */}
                  <button
                    type="button"
                    style={{
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      border: destBranchId === 'CENTRAL' ? '2px solid #8b5cf6' : '1px solid #475569',
                      background: destBranchId === 'CENTRAL' ? 'rgba(139, 92, 246, 0.2)' : '#0f172a',
                      color: destBranchId === 'CENTRAL' ? '#ffffff' : '#94a3b8',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => setDestBranchId('CENTRAL')}
                  >
                    <strong style={{ fontSize: '0.9rem', color: destBranchId === 'CENTRAL' ? '#ffffff' : '#e2e8f0' }}>
                      🏢 Cocina Central
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: destBranchId === 'CENTRAL' ? '#c4b5fd' : '#64748b' }}>
                      Regreso de ollas / Devolución sobrante
                    </span>
                  </button>
                </div>
              </div>

              {/* SELECTOR DE PRODUCTOS Y CANTIDADES */}
              <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 800, margin: 0 }}>
                    Selecciona las cantidades a trasladar:
                  </label>

                  {/* Filtro categoría */}
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: filterCategory === 'ALL' ? '#3b82f6' : '#0f172a',
                        color: filterCategory === 'ALL' ? '#ffffff' : '#94a3b8',
                        border: '1px solid #334155',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFilterCategory('ALL')}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: filterCategory === 'SOPAS' ? '#f97316' : '#0f172a',
                        color: filterCategory === 'SOPAS' ? '#ffffff' : '#94a3b8',
                        border: '1px solid #334155',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFilterCategory('SOPAS')}
                    >
                      🍲 Sopas
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: filterCategory === 'EXTRAS' ? '#38bdf8' : '#0f172a',
                        color: filterCategory === 'EXTRAS' ? '#ffffff' : '#94a3b8',
                        border: '1px solid #334155',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFilterCategory('EXTRAS')}
                    >
                      🥤 Extras
                    </button>
                  </div>
                </div>

                {filteredSoups.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: '0.85rem' }}>
                    No hay productos en esta categoría.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredSoups.map(s => {
                      const curStock = session?.currentStock?.[s.id] ?? 0;
                      const selectedQty = quantities[s.id] || 0;
                      const isOutOfStock = !isOriginUnlimited && session && session.status === 'OPEN' && curStock <= 0;
                      const isExtra = isExtraItem(s);
                      const maxLimit = isOriginUnlimited ? undefined : curStock;

                      return (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.85rem',
                            borderRadius: '10px',
                            background: selectedQty > 0 ? 'rgba(59, 130, 246, 0.15)' : '#0f172a',
                            border: selectedQty > 0 ? '1.5px solid #3b82f6' : '1px solid #334155',
                            opacity: isOutOfStock ? 0.5 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* INFORMACIÓN DEL PRODUCTO */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '4px',
                                backgroundColor: s.bgColor || '#E65100',
                                flexShrink: 0
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: isOutOfStock ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>Disponible: <strong>{isOriginUnlimited ? '♾️ Continuo' : curStock}</strong></span>
                                {isExtra && <span style={{ color: '#38bdf8' }}>• Extra</span>}
                              </div>
                            </div>
                          </div>

                          {/* CONTROLES DE CANTIDAD (+ / - / MAX) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                width: '32px',
                                height: '32px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: '#1e293b',
                                border: '1px solid #475569',
                                color: '#ffffff'
                              }}
                              disabled={selectedQty <= 0}
                              onClick={() => handleQtyChange(s.id, -1, maxLimit)}
                            >
                              <Minus size={15} />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={maxLimit}
                              value={selectedQty || ''}
                              placeholder="0"
                              onChange={e => handleManualInput(s.id, e.target.value, maxLimit)}
                              style={{
                                width: '50px',
                                height: '32px',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: selectedQty > 0 ? '#60a5fa' : '#ffffff',
                                background: '#0f172a',
                                border: selectedQty > 0 ? '1.5px solid #3b82f6' : '1px solid #475569',
                                borderRadius: '8px'
                              }}
                            />

                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                width: '32px',
                                height: '32px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: '#1e293b',
                                border: '1px solid #475569',
                                color: '#ffffff'
                              }}
                              disabled={!isOriginUnlimited && (isOutOfStock || selectedQty >= curStock)}
                              onClick={() => handleQtyChange(s.id, 1, maxLimit)}
                            >
                              <Plus size={15} />
                            </button>

                            {isOriginUnlimited ? (
                              <button
                                type="button"
                                style={{
                                  padding: '4px 7px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  borderRadius: '6px',
                                  background: selectedQty > 0 ? '#0284c7' : '#1e293b',
                                  color: selectedQty > 0 ? '#ffffff' : '#38bdf8',
                                  border: '1px solid #0284c7',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleQtyChange(s.id, 10, undefined)}
                                title="Agregar +10 unidades"
                              >
                                +10
                              </button>
                            ) : curStock > 0 ? (
                              <button
                                type="button"
                                style={{
                                  padding: '4px 7px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  borderRadius: '6px',
                                  background: selectedQty === curStock ? '#3b82f6' : '#1e293b',
                                  color: selectedQty === curStock ? '#ffffff' : '#94a3b8',
                                  border: '1px solid #475569',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleSetMax(s.id, curStock)}
                                title={`Trasladar todo el stock disponible (${curStock})`}
                              >
                                Max
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MOTIVO / OBSERVACIONES (OPCIONAL) */}
              <div>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Motivo u Observación (Opcional):
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder='Ej. "Hacían falta 5 de res en Boulevard", "Regreso de ollas sobrantes", etc.'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '8px' }}
                />
              </div>

              {/* RESUMEN Y BOTÓN CONFIRMAR */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
                border: '1.5px solid #3b82f6',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>
                      Resumen del Traslado:
                    </span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                      {totalUnitsSelected} {totalUnitsSelected === 1 ? 'unidad' : 'unidades'} hacia {targetName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Impacto en Caja</span>
                    <strong style={{ fontSize: '1.1rem', color: '#22c55e' }}>L. 0.00</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={totalUnitsSelected === 0 || isSaving}
                  style={{
                    padding: '0.85rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: totalUnitsSelected > 0 ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#334155',
                    color: '#ffffff',
                    border: 'none',
                    cursor: totalUnitsSelected > 0 && !isSaving ? 'pointer' : 'not-allowed',
                    boxShadow: totalUnitsSelected > 0 ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none'
                  }}
                >
                  <ArrowLeftRight size={20} />
                  {isSaving ? 'Procesando Traslado...' : `Confirmar y Enviar ${totalUnitsSelected} Unidades`}
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: HISTORIAL DE TRASLADOS DE HOY */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                <span>Movimientos registrados hoy ({todayTransfers.length}):</span>
                <button
                  type="button"
                  onClick={fetchTodayTransfers}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Actualizar
                </button>
              </div>

              {loadingTransfers ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Cargando movimientos...
                </div>
              ) : todayTransfers.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '12px' }}>
                  No hay traslados registrados hoy desde o hacia esta sucursal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {todayTransfers.map(tr => {
                    const isOutbound = tr.originBranchId === activeBranch?.id;
                    const timeFormatted = tr.createdAt?.toDate ? tr.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hoy';

                    return (
                      <div
                        key={tr.id}
                        style={{
                          background: '#1e293b',
                          border: isOutbound ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '12px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: isOutbound ? 'rgba(249, 115, 22, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                              color: isOutbound ? '#f97316' : '#22c55e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isOutbound ? '📤 Enviado a' : '📥 Recibido desde'} {isOutbound ? tr.destinationBranchName : tr.originBranchName}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>• {timeFormatted}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                              {tr.totalUnits} {tr.totalUnits === 1 ? 'unidad' : 'unidades'}
                            </strong>
                            {isOutbound && (
                              <button
                                type="button"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#ef4444',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                onClick={() => handleCancelTransfer(tr)}
                                title="Anular este traslado y devolver las existencias al inventario"
                              >
                                <Trash2 size={13} /> Anular
                              </button>
                            )}
                          </div>
                        </div>

                        {/* DESGLOSE DE PRODUCTOS TRASLADADOS */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {(tr.items || []).map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.78rem',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                color: '#cbd5e1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: it.bgColor || '#E65100' }} />
                              <strong>{it.qty}x</strong> {it.name}
                            </span>
                          ))}
                        </div>

                        {tr.notes && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Nota: "{tr.notes}"
                          </div>
                        )}

                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Registrado por: {tr.createdBy || 'Colaborador'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
