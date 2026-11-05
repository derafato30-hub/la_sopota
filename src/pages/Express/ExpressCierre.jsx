import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Calculator, CheckCircle2, AlertTriangle, Printer, History, DollarSign, PackageCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExpressCierre({ activeBranch, soups, session, onSessionUpdate }) {
  const { currentUser } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  // Arqueo de efectivo
  const [declaredCash, setDeclaredCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  // Historial de cierres anteriores
  const [pastClosures, setPastClosures] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const sessionId = activeBranch ? `${activeBranch.id}_${todayStr}` : null;

  useEffect(() => {
    if (activeBranch) {
      fetchTodayBranchSales();
      fetchPastClosures();
    }
  }, [activeBranch]);

  const fetchTodayBranchSales = async () => {
    if (!activeBranch) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'express_sales'),
        where('branchId', '==', activeBranch.id),
        where('dateStr', '==', todayStr)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSales(list);
    } catch (err) {
      console.error('Error al cargar ventas del día:', err);
      toast.error('Error al cargar ventas para el cierre');
    } finally {
      setLoading(false);
    }
  };

  const fetchPastClosures = async () => {
    if (!activeBranch) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'express_closures'),
        where('branchId', '==', activeBranch.id),
        orderBy('closedAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPastClosures(list);
    } catch (err) {
      console.error('Error cargando historial de cierres:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // CÁLCULOS FINANCIEROS DEL DÍA
  const totalSalesAmount = sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCashSales = sales.filter(s => s.paymentMethod === 'EFECTIVO').reduce((acc, s) => acc + (s.total || 0), 0);
  const totalTransferSales = sales.filter(s => s.paymentMethod === 'TRANSFERENCIA').reduce((acc, s) => acc + (s.total || 0), 0);

  // Desglose por banco
  const bankBreakdown = {};
  sales.filter(s => s.paymentMethod === 'TRANSFERENCIA').forEach(s => {
    const bName = s.bank || 'Transferencia General';
    bankBreakdown[bName] = (bankBreakdown[bName] || 0) + (s.total || 0);
  });

  // Fondo inicial declarado
  const initialCashFloat = session?.initialCash || 0;
  // Efectivo total que debería haber en caja
  const expectedCashInDrawer = initialCashFloat + totalCashSales;

  // Diferencia
  const numDeclaredCash = parseFloat(declaredCash);
  const hasEnteredCash = !isNaN(numDeclaredCash);
  const difference = hasEnteredCash ? (numDeclaredCash - expectedCashInDrawer) : 0;

  // CÁLCULO DE INVENTARIO VENDIDO
  const soupSalesSummary = soups.map(s => {
    let soldQty = 0;
    sales.forEach(sale => {
      (sale.items || []).forEach(it => {
        if (it.soupId === s.id) soldQty += (it.qty || 0);
      });
    });
    const initial = session?.initialStock?.[s.id] || 0;
    const remaining = Math.max(0, initial - soldQty);
    return {
      soupId: s.id,
      name: s.name,
      bgColor: s.bgColor,
      price: s.price,
      initial,
      soldQty,
      remaining
    };
  });

  const totalSoupsSold = soupSalesSummary.reduce((acc, it) => acc + it.soldQty, 0);

  // REALIZAR CIERRE INDEPENDIENTE
  const handlePerformClosure = async () => {
    if (!hasEnteredCash) {
      return toast.error('Ingresa el monto de efectivo físico contado en caja.');
    }
    if (!confirm(`¿Confirmas el cierre del día para ${activeBranch.name}? Esta acción registrará las finanzas e inventario final.`)) {
      return;
    }

    setClosing(true);
    try {
      const closureData = {
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        sessionId: sessionId,
        date: todayStr,
        closedAt: serverTimestamp(),
        closedBy: currentUser?.email || 'cajero_express',
        totalSales: totalSalesAmount,
        totalCash: totalCashSales,
        totalTransfer: totalTransferSales,
        bankBreakdown: bankBreakdown,
        initialCashFloat: initialCashFloat,
        expectedCash: expectedCashInDrawer,
        declaredCash: numDeclaredCash,
        difference: difference,
        totalSoupsSold: totalSoupsSold,
        inventorySummary: soupSalesSummary,
        notes: closureNotes.trim()
      };

      // 1. Guardar registro en express_closures
      await setDoc(doc(db, 'express_closures', `${activeBranch.id}_${todayStr}`), closureData);

      // 2. Marcar express_sessions como CLOSED
      if (sessionId) {
        await updateDoc(doc(db, 'express_sessions', sessionId), {
          status: 'CLOSED',
          closedAt: serverTimestamp(),
          closedBy: currentUser?.email || 'cajero_express',
          finalDifference: difference
        });
      }

      toast.success(`¡Cierre finalizado exitosamente para ${activeBranch.name}!`);
      if (onSessionUpdate && session) {
        onSessionUpdate({ ...session, status: 'CLOSED' });
      }
      fetchPastClosures();
    } catch (err) {
      console.error('Error al realizar cierre:', err);
      toast.error('Error al guardar el cierre.');
    } finally {
      setClosing(false);
    }
  };

  // IMPRIMIR TICKET TÉRMICO DE CIERRE
  const handlePrintClosure = (cData) => {
    const data = cData || {
      branchName: activeBranch?.name,
      date: todayStr,
      closedBy: currentUser?.email,
      totalSales: totalSalesAmount,
      totalCash: totalCashSales,
      totalTransfer: totalTransferSales,
      bankBreakdown,
      initialCashFloat,
      expectedCash: expectedCashInDrawer,
      declaredCash: numDeclaredCash,
      difference,
      inventorySummary: soupSalesSummary
    };

    const printWin = window.open('', '_blank');
    if (!printWin) return toast.error('Habilita las ventanas emergentes para imprimir.');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cierre Diario - ${data.branchName}</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 80mm; color: black; background: white; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          td, th { padding: 3px 0; }
          hr { border: none; border-top: 1px dashed black; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0;">RESTAURANTE LA SOPOTA</h2>
          <h3 style="margin: 3px 0;">CIERRE EXPRÉS DE CAJA</h3>
          <p style="margin: 2px 0;"><strong>${data.branchName}</strong></p>
          <p style="margin: 2px 0;">Fecha: ${data.date}</p>
          <p style="margin: 2px 0;">Cajero: ${data.closedBy || 'Cajero'}</p>
        </div>
        <hr/>
        <div class="font-bold">RESUMEN DE VENTAS:</div>
        <table>
          <tr><td>Total Ventas:</td><td class="text-right font-bold">L. ${(data.totalSales || 0).toFixed(2)}</td></tr>
          <tr><td>En Efectivo:</td><td class="text-right">L. ${(data.totalCash || 0).toFixed(2)}</td></tr>
          <tr><td>En Transferencias:</td><td class="text-right">L. ${(data.totalTransfer || 0).toFixed(2)}</td></tr>
        </table>
        <hr/>
        <div class="font-bold">ARQUEO DE CAJA:</div>
        <table>
          <tr><td>Fondo Inicial:</td><td class="text-right">L. ${(data.initialCashFloat || 0).toFixed(2)}</td></tr>
          <tr><td>Efectivo Esperado:</td><td class="text-right font-bold">L. ${(data.expectedCash || 0).toFixed(2)}</td></tr>
          <tr><td>Efectivo Declarado:</td><td class="text-right font-bold">L. ${(data.declaredCash || 0).toFixed(2)}</td></tr>
          <tr><td>Diferencia:</td><td class="text-right font-bold">${(data.difference || 0) >= 0 ? '+' : ''}${(data.difference || 0).toFixed(2)}</td></tr>
        </table>
        <hr/>
        <div class="font-bold">INVENTARIO DE SOPAS:</div>
        <table>
          <tr style="border-bottom: 1px dashed black;">
            <th>Sopa</th>
            <th class="text-center">Ini</th>
            <th class="text-center">Ven</th>
            <th class="text-center">Sob</th>
          </tr>
          ${(data.inventorySummary || []).map(it => `
            <tr>
              <td>${it.name}</td>
              <td class="text-center">${it.initial}</td>
              <td class="text-center font-bold">${it.soldQty}</td>
              <td class="text-center">${it.remaining}</td>
            </tr>
          `).join('')}
        </table>
        <hr/>
        <div class="text-center" style="margin-top: 15px;">
          <p>___________________________</p>
          <p>Firma de Responsable</p>
          <p style="font-size: 10px; color: #555;">La Sopota Express Management</p>
        </div>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 250);
  };

  if (!activeBranch) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Calculator size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <p>Por favor selecciona una sucursal para realizar su cierre.</p>
      </div>
    );
  }

  const isAlreadyClosed = session?.status === 'CLOSED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={26} /> Cierre Diario ({activeBranch.name})
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Fecha: <strong>{todayStr}</strong> | Estado:{' '}
            <span style={{ color: isAlreadyClosed ? '#3b82f6' : '#22c55e', fontWeight: 'bold' }}>
              {isAlreadyClosed ? '● DÍA CERRADO' : '● EN OPERACIÓN'}
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewHistory(!viewHistory)}
          >
            <History size={18} /> {viewHistory ? 'Ver Cierre de Hoy' : 'Historial de Cierres'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchTodayBranchSales}
            title="Recargar ventas"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* VISTA 1: HISTORIAL DE CIERRES ANTERIORES */}
      {viewHistory ? (
        <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Historial de Cierres de {activeBranch.name}</h3>
          {loadingHistory ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando cierres...</div>
          ) : pastClosures.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No hay cierres registrados aún para este punto de venta.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem' }}>FECHA</th>
                    <th style={{ padding: '0.75rem' }}>TOTAL VENTAS</th>
                    <th style={{ padding: '0.75rem' }}>EFECTIVO</th>
                    <th style={{ padding: '0.75rem' }}>TRANSFERENCIA</th>
                    <th style={{ padding: '0.75rem' }}>DIFERENCIA</th>
                    <th style={{ padding: '0.75rem' }}>SOPAS VENDIDAS</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {pastClosures.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{c.date}</td>
                      <td style={{ padding: '0.75rem', color: '#f97316', fontWeight: 'bold' }}>L. {(c.totalSales || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>L. {(c.totalCash || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>L. {(c.totalTransfer || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold', color: c.difference === 0 ? '#22c55e' : c.difference > 0 ? '#38bdf8' : '#ef4444' }}>
                        {c.difference === 0 ? 'Exacta' : (c.difference > 0 ? `+L. ${c.difference.toFixed(2)}` : `-L. ${Math.abs(c.difference).toFixed(2)}`)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{c.totalSoupsSold || 0}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                          onClick={() => handlePrintClosure(c)}
                        >
                          <Printer size={14} /> Imprimir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: CIERRE DEL DÍA ACTIVO */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* TARJETA 1: FINANZAS Y ARQUEO */}
          <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
              <DollarSign size={20} /> Finanzas de la Sucursal
            </h3>

            {/* RESUMEN DE VENTAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Tickets Cobrados:</span>
                <strong>{sales.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas en Efectivo:</span>
                <strong style={{ color: '#22c55e' }}>L. {totalCashSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas en Transferencia:</span>
                <strong style={{ color: '#38bdf8' }}>L. {totalTransferSales.toFixed(2)}</strong>
              </div>
              {Object.keys(bankBreakdown).length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)', margin: '0.25rem 0' }}>
                  {Object.entries(bankBreakdown).map(([b, amt]) => (
                    <div key={b} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>↳ {b}:</span>
                      <span>L. {amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.35rem', borderTop: '2px dashed var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                <span style={{ fontWeight: 800 }}>Total Ventas del Día:</span>
                <strong style={{ color: 'var(--primary-color)' }}>L. {totalSalesAmount.toFixed(2)}</strong>
              </div>
            </div>

            {/* ARQUEO DE EFECTIVO */}
            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Arqueo de Efectivo en Caja
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span>Fondo Inicial de Caja:</span>
                <span>L. {initialCashFloat.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
                <span>Efectivo Esperado en Caja:</span>
                <span style={{ color: '#f59e0b' }}>L. {expectedCashInDrawer.toFixed(2)}</span>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Efectivo Físico Contado (Billetes/Monedas): *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>L.</span>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={declaredCash}
                    onChange={e => setDeclaredCash(e.target.value)}
                    style={{ width: '100%', fontSize: '1.25rem', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* CUADRE O DESCUADRE */}
              {hasEnteredCash && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    backgroundColor: difference === 0 ? 'rgba(34, 197, 94, 0.15)' : difference > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${difference === 0 ? '#22c55e' : difference > 0 ? '#38bdf8' : '#ef4444'}`
                  }}
                >
                  <h4 style={{ margin: 0, color: difference === 0 ? '#22c55e' : difference > 0 ? '#38bdf8' : '#ef4444' }}>
                    {difference === 0 ? '✓ CAJA CUADRADA EXACTA' : difference > 0 ? `+ SOBRANTE: L. ${difference.toFixed(2)}` : `- FALTANTE: L. ${Math.abs(difference).toFixed(2)}`}
                  </h4>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Notas u Observaciones del Cierre:
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Ej. Se pagaron L. 50 de hielo o todo entregado en orden..."
                  value={closureNotes}
                  onChange={e => setClosureNotes(e.target.value)}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.85rem', fontWeight: 'bold' }}
                  onClick={handlePerformClosure}
                  disabled={closing}
                >
                  <CheckCircle2 size={18} />
                  {closing ? 'Guardando Cierre...' : isAlreadyClosed ? 'Actualizar Cierre de Hoy' : 'Finalizar Cierre de Sucursal'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.85rem' }}
                  onClick={() => handlePrintClosure(null)}
                  title="Imprimir ticket térmico"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* TARJETA 2: INVENTARIO DE SOPAS Y DISPONIBILIDAD */}
          <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316' }}>
              <PackageCheck size={20} /> Balance de Inventario de Sopas
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>SOPA</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>INICIAL</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>VENDIDAS</th>
                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>SOBRANTE</th>
                  </tr>
                </thead>
                <tbody>
                  {soupSalesSummary.map(item => (
                    <tr key={item.soupId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.bgColor || '#E65100', flexShrink: 0 }} />
                        <span style={{ fontWeight: 'bold', fontSize: '0.92rem' }}>{item.name}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{item.initial}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#f97316' }}>{item.soldQty}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: item.remaining === 0 ? '#ef4444' : '#22c55e' }}>
                        {item.remaining}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface-hover)', fontWeight: 'bold' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>TOTALES:</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {soupSalesSummary.reduce((acc, it) => acc + it.initial, 0)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#f97316' }}>
                      {totalSoupsSold}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {soupSalesSummary.reduce((acc, it) => acc + it.remaining, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
