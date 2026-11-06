import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { DollarSign, Plus, Trash2, X, Store, Check, AlertCircle, Banknote, CreditCard, Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QUICK_EXPENSE_SUGGESTIONS = [
  { label: '❄️ Hielo', concept: 'Compra de Hielo' },
  { label: '🛍️ Bolsas / Desechables', concept: 'Bolsas y Desechables' },
  { label: '⛽ Combustible', concept: 'Gasolina / Combustible' },
  { label: '💧 Agua Purificada', concept: 'Agua Purificada' },
  { label: '🧽 Insumos de Limpieza', concept: 'Insumos de Limpieza' },
  { label: '🥑 Acompañantes Extra', concept: 'Aguacate / Limones / Verdura' }
];

export default function ExpressGastoModal({ isOpen, onClose, activeBranch, onExpenseChanged }) {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [paymentSource, setPaymentSource] = useState('EFECTIVO'); // 'EFECTIVO' | 'TRANSFERENCIA'
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expensesToday, setExpensesToday] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen && activeBranch) {
      fetchBranchExpensesToday();
    }
  }, [isOpen, activeBranch]);

  const fetchBranchExpensesToday = async () => {
    if (!activeBranch) return;
    setLoadingList(true);
    try {
      const q = query(
        collection(db, 'express_expenses'),
        where('branchId', '==', activeBranch.id),
        where('dateStr', '==', todayStr)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setExpensesToday(list);
    } catch (err) {
      console.error('Error cargando gastos de sucursal:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectSuggestion = (sug) => {
    setConcept(sug.concept);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeBranch) return toast.error('No hay sucursal activa seleccionada.');
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return toast.error('Ingresa un monto válido mayor a 0');
    }
    if (!concept.trim()) {
      return toast.error('Ingresa el concepto o motivo del gasto');
    }

    setSaving(true);
    try {
      const payload = {
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        dateStr: todayStr,
        amount: numAmount,
        concept: concept.trim(),
        paymentSource: paymentSource, // 'EFECTIVO' o 'TRANSFERENCIA'
        notes: notes.trim() || null,
        createdBy: currentUser?.email || 'colaborador_express',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'express_expenses'), payload);
      toast.success(`Gasto de L. ${numAmount.toFixed(2)} registrado para ${activeBranch.name}`);

      // Reset form
      setAmount('');
      setConcept('');
      setNotes('');
      setPaymentSource('EFECTIVO');

      fetchBranchExpensesToday();
      if (onExpenseChanged) onExpenseChanged();
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      toast.error('Error al registrar gasto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id, expName, expAmount) => {
    if (!confirm(`¿Eliminar el gasto "${expName}" por L. ${Number(expAmount).toFixed(2)}?`)) return;
    try {
      await deleteDoc(doc(db, 'express_expenses', id));
      toast.success('Gasto eliminado');
      fetchBranchExpensesToday();
      if (onExpenseChanged) onExpenseChanged();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar gasto');
    }
  };

  if (!isOpen) return null;

  const totalToday = expensesToday.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalCashToday = expensesToday
    .filter(e => e.paymentSource === 'EFECTIVO' || !e.paymentSource)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <>
      <div className="express-drawer-overlay" onClick={onClose} />
      <div className="express-extras-drawer" style={{ maxWidth: '620px' }}>
        {/* HEADER */}
        <div className="express-drawer-header" style={{ background: '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Receipt size={24} color="#f43f5e" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                Registrar Gasto de Sucursal
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Store size={14} color="#f97316" /> {activeBranch?.name || 'Punto de Venta'}
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

        {/* BODY */}
        <div className="express-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* FORMULARIO DE NUEVO GASTO */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#1e293b', padding: '1.1rem', borderRadius: '14px', border: '1px solid #334155' }}>
            {/* MONTO */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                Monto del Gasto (L.) *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: '#f43f5e', fontSize: '1.2rem' }}>L.</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', paddingLeft: '34px', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', background: '#0f172a', border: '1.5px solid #475569', borderRadius: '10px' }}
                />
              </div>
            </div>

            {/* BOTONES RÁPIDOS DE SUGERENCIA */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Sugerencias Rápidas de Concepto:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {QUICK_EXPENSE_SUGGESTIONS.map(sug => (
                  <button
                    key={sug.concept}
                    type="button"
                    className="btn-secondary"
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: '16px',
                      background: concept === sug.concept ? '#f43f5e' : '#0f172a',
                      color: concept === sug.concept ? '#ffffff' : '#cbd5e1',
                      border: '1px solid #334155'
                    }}
                    onClick={() => handleSelectSuggestion(sug)}
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONCEPTO / MOTIVO */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                Concepto / Motivo del Gasto *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Compra de 2 bolsas de hielo, servilletas, etc."
                value={concept}
                onChange={e => setConcept(e.target.value)}
                required
                style={{ width: '100%', fontSize: '0.95rem', background: '#0f172a', border: '1.5px solid #475569', color: '#ffffff', borderRadius: '10px' }}
              />
            </div>

            {/* ORIGEN DEL DINERO (EFECTIVO DE CAJA vs TRANSFERENCIA) */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                ¿De dónde salió el dinero? *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    padding: '0.65rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    border: paymentSource === 'EFECTIVO' ? '2px solid #22c55e' : '1px solid #334155',
                    background: paymentSource === 'EFECTIVO' ? 'rgba(34, 197, 94, 0.2)' : '#0f172a',
                    color: paymentSource === 'EFECTIVO' ? '#22c55e' : '#94a3b8'
                  }}
                  onClick={() => setPaymentSource('EFECTIVO')}
                >
                  <Banknote size={16} /> Efectivo de Caja
                </button>
                <button
                  type="button"
                  style={{
                    padding: '0.65rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    border: paymentSource === 'TRANSFERENCIA' ? '2px solid #38bdf8' : '1px solid #334155',
                    background: paymentSource === 'TRANSFERENCIA' ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                    color: paymentSource === 'TRANSFERENCIA' ? '#38bdf8' : '#94a3b8'
                  }}
                  onClick={() => setPaymentSource('TRANSFERENCIA')}
                >
                  <CreditCard size={16} /> Transferencia
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                {paymentSource === 'EFECTIVO'
                  ? '⚠️ Se restará automáticamente del efectivo físico esperado al hacer el cierre.'
                  : 'ℹ️ No afectará el efectivo físico de caja, pero se documenta en las finanzas del día.'}
              </span>
            </div>

            {/* BOTÓN REGISTRAR */}
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '0.85rem',
                fontSize: '1.05rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(244, 63, 94, 0.35)'
              }}
              disabled={saving}
            >
              <Plus size={18} />
              {saving ? 'Guardando...' : `Guardar Gasto (L. ${parseFloat(amount || '0').toFixed(2)})`}
            </button>
          </form>

          {/* LISTADO DE GASTOS REGISTRADOS HOY EN ESTA SUCURSAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>
                Gastos de Hoy en este Punto ({expensesToday.length}):
              </strong>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f43f5e' }}>
                Total: L. {totalToday.toFixed(2)} {totalCashToday > 0 && `(L. ${totalCashToday.toFixed(2)} de caja)`}
              </span>
            </div>

            {loadingList ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Cargando gastos...
              </div>
            ) : expensesToday.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: '#1e293b', borderRadius: '10px' }}>
                No se han registrado gastos hoy para esta sucursal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {expensesToday.map(exp => (
                  <div
                    key={exp.id}
                    style={{
                      background: '#1e293b',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${exp.paymentSource === 'EFECTIVO' ? '#22c55e' : '#38bdf8'}`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                        {exp.concept}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {exp.paymentSource === 'EFECTIVO' ? '💵 Efectivo de Caja' : '💳 Transferencia'} • Por: {exp.createdBy?.split('@')[0]}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong style={{ color: '#f43f5e', fontSize: '1rem' }}>
                        - L. {Number(exp.amount).toFixed(2)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id, exp.concept, exp.amount)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        title="Eliminar este gasto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="express-drawer-footer" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
