import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Calculator, CheckCircle2, AlertTriangle, Printer, History, DollarSign, PackageCheck, RefreshCw, BarChart3, Store, Receipt, Plus, Trash2, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ExpressGastoModal from './ExpressGastoModal';
import ExpressTrasladoModal from './ExpressTrasladoModal';
import { clearBranchInventoryAndTests } from './expressResetService';

export default function ExpressCierre({ activeBranch, branches = [], onSelectBranch, soups, session, onSessionUpdate }) {
  const { currentUser } = useAuth();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [trasladoModalOpen, setTrasladoModalOpen] = useState(false);
  const [outboundTransfers, setOutboundTransfers] = useState([]);
  const [inboundTransfers, setInboundTransfers] = useState([]);
  const [allTransfersToday, setAllTransfersToday] = useState([]);

  // Arqueo de efectivo
  const [declaredCash, setDeclaredCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  // Historial de cierres anteriores
  const [pastClosures, setPastClosures] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);

  // Vista Consolidada Multi-Sucursal (Exclusiva para Administrador)
  const [viewConsolidated, setViewConsolidated] = useState(false);
  const [allSalesToday, setAllSalesToday] = useState([]);
  const [allExpensesToday, setAllExpensesToday] = useState([]);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const sessionId = activeBranch ? `${activeBranch.id}_${todayStr}` : null;

  useEffect(() => {
    if (activeBranch) {
      fetchTodayBranchData();
      fetchPastClosures();
    }
  }, [activeBranch]);

  useEffect(() => {
    if (viewConsolidated) {
      fetchAllBranchesSalesToday();
    }
  }, [viewConsolidated]);

  const fetchTodayBranchData = async () => {
    if (!activeBranch) return;
    setLoading(true);
    try {
      // 1. Cargar Ventas
      const qSales = query(
        collection(db, 'express_sales'),
        where('branchId', '==', activeBranch.id),
        where('dateStr', '==', todayStr)
      );
      const snapSales = await getDocs(qSales);
      const sList = [];
      snapSales.forEach(d => sList.push({ id: d.id, ...d.data() }));
      setSales(sList);

      // 2. Cargar Gastos de la sucursal
      const qExp = query(
        collection(db, 'express_expenses'),
        where('branchId', '==', activeBranch.id),
        where('dateStr', '==', todayStr)
      );
      const snapExp = await getDocs(qExp);
      const eList = [];
      snapExp.forEach(d => eList.push({ id: d.id, ...d.data() }));
      eList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setExpenses(eList);
    } catch (err) {
      console.error('Error al cargar datos del día para el cierre:', err);
      toast.error('Error al cargar datos de cierre');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBranchesSalesToday = async () => {
    setLoadingConsolidated(true);
    try {
      // 1. Todas las ventas globales
      const qSales = query(
        collection(db, 'express_sales'),
        where('dateStr', '==', todayStr)
      );
      const snapSales = await getDocs(qSales);
      const sList = [];
      snapSales.forEach(d => sList.push({ id: d.id, ...d.data() }));
      setAllSalesToday(sList);

      // 2. Todos los gastos globales
      const qExp = query(
        collection(db, 'express_expenses'),
        where('dateStr', '==', todayStr)
      );
      const snapExp = await getDocs(qExp);
      const eList = [];
      snapExp.forEach(d => eList.push({ id: d.id, ...d.data() }));
      setAllExpensesToday(eList);
    } catch (err) {
      console.error('Error cargando datos consolidados:', err);
      toast.error('Error al cargar reporte consolidado');
    } finally {
      setLoadingConsolidated(false);
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

  // CÁLCULOS FINANCIEROS DE LA SUCURSAL ACTIVA
  const totalSalesAmount = sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCashSales = sales.filter(s => s.paymentMethod === 'EFECTIVO').reduce((acc, s) => acc + (s.total || 0), 0);
  const totalTransferSales = sales.filter(s => s.paymentMethod === 'TRANSFERENCIA').reduce((acc, s) => acc + (s.total || 0), 0);

  // Desglose por banco
  const bankBreakdown = {};
  sales.filter(s => s.paymentMethod === 'TRANSFERENCIA').forEach(s => {
    const bName = s.bank || 'Transferencia General';
    bankBreakdown[bName] = (bankBreakdown[bName] || 0) + (s.total || 0);
  });

  // Gastos de la sucursal activa
  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const totalCashExpenses = expenses
    .filter(e => e.paymentSource === 'EFECTIVO' || !e.paymentSource)
    .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const totalTransferExpenses = expenses
    .filter(e => e.paymentSource === 'TRANSFERENCIA')
    .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

  // Balance neto del punto (Ventas - Gastos)
  const netBranchBalance = totalSalesAmount - totalExpenses;

  // Fondo inicial declarado en caja
  const initialCashFloat = session?.initialCash || 0;
  // Efectivo total esperado en caja física = Fondo Inicial + Ventas Efectivo - Gastos Pagados con Efectivo de Caja
  const expectedCashInDrawer = Math.max(0, initialCashFloat + totalCashSales - totalCashExpenses);

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

  // REALIZAR CIERRE INDEPENDIENTE DE LA SUCURSAL
  const handlePerformClosure = async () => {
    if (!hasEnteredCash) {
      return toast.error('Ingresa el monto de efectivo físico contado en caja.');
    }
    if (!confirm(`¿Confirmas el cierre del día para ${activeBranch.name}? Esta acción registrará las finanzas, gastos e inventario final.`)) {
      return;
    }

    setClosing(true);
    try {
      const closureData = {
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        date: todayStr,
        closedAt: serverTimestamp(),
        closedBy: currentUser?.email || 'admin',
        totalSales: totalSalesAmount,
        totalCashSales: totalCashSales,
        totalTransferSales: totalTransferSales,
        bankBreakdown: bankBreakdown,
        initialCashFloat: initialCashFloat,
        totalExpenses: totalExpenses,
        totalCashExpenses: totalCashExpenses,
        totalTransferExpenses: totalTransferExpenses,
        expensesSummary: expenses.map(e => ({
          id: e.id,
          concept: e.concept,
          amount: e.amount,
          paymentSource: e.paymentSource || 'EFECTIVO',
          createdBy: e.createdBy
        })),
        netBalance: netBranchBalance,
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
          closedBy: currentUser?.email || 'admin',
          finalDifference: difference,
          totalExpenses: totalExpenses
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
      totalCashSales: totalCashSales,
      totalTransferSales: totalTransferSales,
      bankBreakdown,
      initialCashFloat,
      totalExpenses,
      totalCashExpenses,
      totalTransferExpenses,
      expensesSummary: expenses,
      netBalance: netBranchBalance,
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
          <p style="margin: 2px 0;">Responsable: ${data.closedBy || 'Admin'}</p>
        </div>
        <hr/>
        <div class="font-bold">RESUMEN DE VENTAS:</div>
        <table>
          <tr><td>Total Ventas:</td><td class="text-right font-bold">L. ${(data.totalSales || data.totalSalesAmount || 0).toFixed(2)}</td></tr>
          <tr><td>En Efectivo:</td><td class="text-right">L. ${(data.totalCashSales || data.totalCash || 0).toFixed(2)}</td></tr>
          <tr><td>En Transferencias:</td><td class="text-right">L. ${(data.totalTransferSales || data.totalTransfer || 0).toFixed(2)}</td></tr>
        </table>
        
        ${(data.expensesSummary && data.expensesSummary.length > 0) ? `
          <hr/>
          <div class="font-bold">SALIDAS / GASTOS DEL PUNTO:</div>
          <table>
            ${data.expensesSummary.map(e => `
              <tr>
                <td>${e.concept} (${e.paymentSource === 'EFECTIVO' ? 'Efect.' : 'Transf.'}):</td>
                <td class="text-right font-bold">- L. ${Number(e.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="border-top: 1px dashed black;">
              <td class="font-bold">Total Gastos:</td>
              <td class="text-right font-bold">- L. ${(data.totalExpenses || 0).toFixed(2)}</td>
            </tr>
          </table>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span class="font-bold">Balance Neto:</span>
            <span class="font-bold">L. ${(data.netBalance !== undefined ? data.netBalance : (data.totalSales || 0) - (data.totalExpenses || 0)).toFixed(2)}</span>
          </div>
        ` : ''}

        <hr/>
        <div class="font-bold">ARQUEO DE CAJA FÍSICA:</div>
        <table>
          <tr><td>Fondo Inicial:</td><td class="text-right">L. ${(data.initialCashFloat || 0).toFixed(2)}</td></tr>
          <tr><td>(+) Ventas Efectivo:</td><td class="text-right">L. ${(data.totalCashSales || data.totalCash || 0).toFixed(2)}</td></tr>
          <tr><td>(-) Gastos de Caja:</td><td class="text-right font-bold">- L. ${(data.totalCashExpenses || 0).toFixed(2)}</td></tr>
          <tr style="border-top: 1px dashed black;">
            <td>Efectivo Esperado:</td>
            <td class="text-right font-bold">L. ${(data.expectedCash || 0).toFixed(2)}</td>
          </tr>
          <tr><td>Efectivo Contado:</td><td class="text-right font-bold">L. ${(data.declaredCash || 0).toFixed(2)}</td></tr>
          <tr><td>Diferencia:</td><td class="text-right font-bold">${(data.difference || 0) >= 0 ? '+' : ''}${(data.difference || 0).toFixed(2)}</td></tr>
        </table>
        <hr/>
        <div class="font-bold">INVENTARIO DE PRODUCTOS:</div>
        <table>
          <tr style="border-bottom: 1px dashed black;">
            <th>Producto</th>
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

  // CÁLCULOS VISTA CONSOLIDADA (GLOBAL TODAS LAS SUCURSALES)
  const consolidatedTotalSales = allSalesToday.reduce((sum, s) => sum + (s.total || 0), 0);
  const consolidatedTotalCash = allSalesToday.filter(s => s.paymentMethod === 'EFECTIVO').reduce((sum, s) => sum + (s.total || 0), 0);
  const consolidatedTotalTransfer = allSalesToday.filter(s => s.paymentMethod === 'TRANSFERENCIA').reduce((sum, s) => sum + (s.total || 0), 0);
  const consolidatedTotalSoups = allSalesToday.reduce((sum, s) => sum + ((s.items || []).reduce((sub, it) => sub + (it.qty || 0), 0)), 0);

  const consolidatedTotalExpenses = allExpensesToday.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const consolidatedCashExpenses = allExpensesToday
    .filter(e => e.paymentSource === 'EFECTIVO' || !e.paymentSource)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const consolidatedNetProfit = consolidatedTotalSales - consolidatedTotalExpenses;

  // Agrupado por sucursal
  const branchBreakdown = {};
  branches.forEach(b => {
    branchBreakdown[b.id] = {
      id: b.id,
      name: b.name,
      code: b.code,
      location: b.location,
      ticketsCount: 0,
      totalSales: 0,
      cashSales: 0,
      transferSales: 0,
      soupsCount: 0,
      totalExpenses: 0,
      cashExpenses: 0
    };
  });

  allSalesToday.forEach(s => {
    const bId = s.branchId || 'desconocida';
    if (!branchBreakdown[bId]) {
      branchBreakdown[bId] = {
        id: bId,
        name: s.branchName || 'Otra Sucursal',
        code: '',
        location: '',
        ticketsCount: 0,
        totalSales: 0,
        cashSales: 0,
        transferSales: 0,
        soupsCount: 0,
        totalExpenses: 0,
        cashExpenses: 0
      };
    }
    branchBreakdown[bId].ticketsCount += 1;
    branchBreakdown[bId].totalSales += (s.total || 0);
    if (s.paymentMethod === 'EFECTIVO') branchBreakdown[bId].cashSales += (s.total || 0);
    if (s.paymentMethod === 'TRANSFERENCIA') branchBreakdown[bId].transferSales += (s.total || 0);
    branchBreakdown[bId].soupsCount += (s.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
  });

  allExpensesToday.forEach(e => {
    const bId = e.branchId;
    if (branchBreakdown[bId]) {
      const amt = parseFloat(e.amount) || 0;
      branchBreakdown[bId].totalExpenses += amt;
      if (e.paymentSource === 'EFECTIVO' || !e.paymentSource) {
        branchBreakdown[bId].cashExpenses += amt;
      }
    }
  });

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
      {/* HEADER DE CIERRE CON SELECTOR DE SUCURSAL Y BOTÓN CONSOLIDADO */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={26} /> Cierre y Finanzas (Vista de Administrador)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Fecha: <strong>{todayStr}</strong> | Supervisa ingresos, salidas de caja y cierre por punto.
          </p>
        </div>

        {/* ACCIONES Y SELECTORES PARA EL ADMIN */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {/* SELECTOR RÁPIDO DE SUCURSAL */}
          {branches.length > 0 && !viewConsolidated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', border: '1.5px solid #f97316', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
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

          {/* BOTÓN VISTA CONSOLIDADA MULTI-SUCURSAL */}
          <button
            type="button"
            className={viewConsolidated ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setViewConsolidated(!viewConsolidated);
              setViewHistory(false);
            }}
            style={{ fontWeight: 700, fontSize: '0.9rem' }}
          >
            <BarChart3 size={18} /> {viewConsolidated ? 'Volver a Sucursal' : '🌟 Consolidado General (Todas)'}
          </button>

          {!viewConsolidated && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setViewHistory(!viewHistory)}
              style={{ fontWeight: 700, fontSize: '0.9rem' }}
            >
              <History size={18} /> {viewHistory ? 'Cierre de Hoy' : 'Historial de Cierres'}
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (viewConsolidated) fetchAllBranchesSalesToday();
              else fetchTodayBranchData();
            }}
            title="Recargar datos"
          >
            <RefreshCw size={18} />
          </button>

          {/* BOTÓN ROJO SOLO ADMIN: LIMPIAR INVENTARIO Y PRUEBAS */}
          {!viewConsolidated && (
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
                const ok = await clearBranchInventoryAndTests(activeBranch, onSessionUpdate);
                if (ok) {
                  fetchTodayBranchData();
                }
              }}
              title="Reiniciar y borrar inventario y pruebas de hoy para esta sucursal (Exclusivo Administrador)"
            >
              <Trash2 size={16} />
              <span>Limpiar inventario de esta sucursal</span>
            </button>
          )}
        </div>
      </div>

      {/* VISTA 1: REPORTE CONSOLIDADO DE TODAS LAS SUCURSALES (GLOBAL) */}
      {viewConsolidated ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* TARJETAS RESUMEN GLOBAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #f97316' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Ventas Globales</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-color)', marginTop: '4px' }}>
                L. {consolidatedTotalSales.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{allSalesToday.length} tickets en toda la red</span>
            </div>

            <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #f43f5e' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Gastos Globales</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f43f5e', marginTop: '4px' }}>
                L. {consolidatedTotalExpenses.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{allExpensesToday.length} gastos operativos registrados</span>
            </div>

            <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #22c55e' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Utilidad Neta Combinada</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: consolidatedNetProfit >= 0 ? '#22c55e' : '#ef4444', marginTop: '4px' }}>
                L. {consolidatedNetProfit.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ventas menos gastos totales</span>
            </div>

            <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', borderLeft: '5px solid #38bdf8' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Efectivo Neto en Cajas</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                L. {Math.max(0, consolidatedTotalCash - consolidatedCashExpenses).toFixed(2)}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ventas efect. menos gastos de caja</span>
            </div>
          </div>

          {/* TABLA COMPARATIVA POR CADA SUCURSAL */}
          <div className="card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
              Comparativa de Rendimiento y Gastos por Sucursal (Hoy: {todayStr})
            </h3>

            {loadingConsolidated ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos globales...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem' }}>SUCURSAL</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>TICKETS</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>SOPAS</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>VENTAS TOTALES</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>GASTOS REGISTRADOS</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>BALANCE NETO</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(branchBreakdown).map(bItem => {
                      const net = bItem.totalSales - bItem.totalExpenses;
                      return (
                        <tr key={bItem.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{bItem.name}</strong>
                            {bItem.location && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{bItem.location}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {bItem.ticketsCount}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#c084fc' }}>
                            {bItem.soupsCount}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: 'var(--primary-color)' }}>
                            L. {bItem.totalSales.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: '#f43f5e' }}>
                            - L. {bItem.totalExpenses.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: net >= 0 ? '#22c55e' : '#ef4444' }}>
                            L. {net.toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                              onClick={() => {
                                const target = branches.find(b => b.id === bItem.id);
                                if (target && onSelectBranch) {
                                  onSelectBranch(target);
                                  setViewConsolidated(false);
                                  toast.info(`Cambiado a sucursal: ${target.name}`);
                                }
                              }}
                            >
                              Ver Cierre
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* FILA TOTAL */}
                    <tr style={{ background: 'var(--surface-hover)', fontWeight: 900 }}>
                      <td style={{ padding: '0.75rem' }}>TOTAL GENERAL:</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{allSalesToday.length}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#c084fc' }}>{consolidatedTotalSoups}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--primary-color)', fontSize: '1.15rem' }}>L. {consolidatedTotalSales.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f43f5e', fontSize: '1.15rem' }}>- L. {consolidatedTotalExpenses.toFixed(2)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: consolidatedNetProfit >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.15rem' }}>L. {consolidatedNetProfit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : viewHistory ? (
        /* VISTA 2: HISTORIAL DE CIERRES ANTERIORES DE LA SUCURSAL */
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
                    <th style={{ padding: '0.75rem' }}>VENTAS</th>
                    <th style={{ padding: '0.75rem' }}>GASTOS</th>
                    <th style={{ padding: '0.75rem' }}>BALANCE NETO</th>
                    <th style={{ padding: '0.75rem' }}>DIFERENCIA</th>
                    <th style={{ padding: '0.75rem' }}>SOPAS</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {pastClosures.map(c => {
                    const net = (c.netBalance !== undefined) ? c.netBalance : (c.totalSales || 0) - (c.totalExpenses || 0);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{c.date}</td>
                        <td style={{ padding: '0.75rem', color: '#f97316', fontWeight: 'bold' }}>L. {(c.totalSales || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', color: '#f43f5e', fontWeight: 'bold' }}>- L. {(c.totalExpenses || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', color: net >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800 }}>L. {net.toFixed(2)}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VISTA 3: CIERRE DEL DÍA ACTIVO DE LA SUCURSAL */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* TARJETA 1: FINANZAS Y ARQUEO */}
          <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                <DollarSign size={20} /> Finanzas del Punto: {activeBranch.name}
              </h3>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#f43f5e',
                  border: '1.5px solid #f43f5e',
                  background: 'rgba(244, 63, 94, 0.12)'
                }}
                onClick={() => setExpenseModalOpen(true)}
              >
                <Plus size={14} /> Registrar Gasto
              </button>
            </div>

            {/* RESUMEN DE VENTAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Tickets Cobrados:</span>
                <strong>{sales.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas en Efectivo:</span>
                <strong style={{ color: '#22c55e' }}>L. {totalCashSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas en Transferencia:</span>
                <strong style={{ color: '#38bdf8' }}>L. {totalTransferSales.toFixed(2)}</strong>
              </div>
              {Object.keys(bankBreakdown).length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)', margin: '0.2rem 0' }}>
                  {Object.entries(bankBreakdown).map(([b, amt]) => (
                    <div key={b} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>↳ {b}:</span>
                      <span>L. {amt.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', borderTop: '2px dashed var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                <span style={{ fontWeight: 800 }}>Total Ventas:</span>
                <strong style={{ color: 'var(--primary-color)' }}>L. {totalSalesAmount.toFixed(2)}</strong>
              </div>
            </div>

            {/* SECCIÓN GASTOS Y SALIDAS DE LA SUCURSAL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f43f5e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Receipt size={16} /> Gastos Registrados ({expenses.length})
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {totalCashExpenses > 0 ? `L. ${totalCashExpenses.toFixed(2)} en efectivo` : ''}
                </span>
              </div>

              {expenses.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', padding: '0.25rem 0' }}>
                  No hay gastos registrados hoy para este punto.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.25rem 0' }}>
                  {expenses.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#cbd5e1' }}>
                        ↳ {e.concept} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({e.paymentSource === 'EFECTIVO' ? 'Efectivo' : 'Transf.'})</span>:
                      </span>
                      <strong style={{ color: '#f43f5e' }}>- L. {Number(e.amount).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.45rem', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Gastos del Punto:</span>
                <strong style={{ color: '#f43f5e' }}>- L. {totalExpenses.toFixed(2)}</strong>
              </div>

              {/* BALANCE NETO (VENTAS - GASTOS) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed var(--border-color)', paddingTop: '0.5rem', fontSize: '1.25rem' }}>
                <span style={{ fontWeight: 800 }}>Balance Neto del Día:</span>
                <strong style={{ color: netBranchBalance >= 0 ? '#22c55e' : '#ef4444' }}>
                  L. {netBranchBalance.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* ARQUEO DE EFECTIVO EN CAJA (CON GASTOS RESTADOS) */}
            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Arqueo de Efectivo en Caja
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span>(+) Fondo Inicial de Caja:</span>
                <span>L. {initialCashFloat.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span>(+) Ventas Cobradas en Efectivo:</span>
                <span style={{ color: '#22c55e' }}>L. {totalCashSales.toFixed(2)}</span>
              </div>
              {totalCashExpenses > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span>(-) Gastos Pagados con Efectivo de Caja:</span>
                  <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>- L. {totalCashExpenses.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <span>(=) Efectivo Físico Esperado en Caja:</span>
                <span style={{ color: '#f97316' }}>L. {expectedCashInDrawer.toFixed(2)}</span>
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
                  placeholder="Ej. Todo entregado en orden..."
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

          {/* TARJETA 2: INVENTARIO DE PRODUCTOS Y DISPONIBILIDAD */}
          <div className="card" style={{ background: 'var(--surface-color)', border: 'var(--glass-border)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316' }}>
              <PackageCheck size={20} /> Balance de Inventario: {activeBranch.name}
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>PRODUCTO</th>
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

      {/* MODAL REGISTRAR GASTO */}
      <ExpressGastoModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        activeBranch={activeBranch}
        onExpenseChanged={() => {
          if (viewConsolidated) fetchAllBranchesSalesToday();
          else fetchTodayBranchData();
        }}
      />

      {/* MODAL TRASLADO DE INVENTARIO */}
      <ExpressTrasladoModal
        isOpen={trasladoModalOpen}
        onClose={() => setTrasladoModalOpen(false)}
        activeBranch={activeBranch}
        branches={branches}
        soups={soups}
        session={session}
        onTransferCompleted={() => {
          if (viewConsolidated) fetchAllBranchesSalesToday();
          else fetchTodayBranchData();
        }}
      />
    </div>
  );
}
