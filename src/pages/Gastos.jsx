import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { Wallet, TrendingDown, CheckSquare, History, List, X } from 'lucide-react';
import './Gastos.css';

export default function Gastos() {
  const { currentUser } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPendingOrders, setHasPendingOrders] = useState(false);

  // Formularios
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoData, setGastoData] = useState({ amount: 0, reason: '' });

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreData, setCierreData] = useState({ actualCash: 0, notes: '' });
  const [selectedCierre, setSelectedCierre] = useState(null);

  const [showAbonosDetalleModal, setShowAbonosDetalleModal] = useState(false);

  // Totales Calculados del Día
  const [cierreStats, setCierreStats] = useState({
    ventaTotal: 0,
    creditoOtorgado: 0,
    efectivoVentas: 0,
    transferenciasVentas: 0,
    abonosEfectivo: 0,
    abonosTransferencia: 0,
    gastosOperativos: 0,
    gastosTerceros: 0,
    pagosRepartidores: 0,
    efectivoEsperado: 0,
    depositosTotal: 0, // transferenciasVentas + abonosTransferencia
    bancos: {
      'Bac Antony': 0, 'Bac Delmy': 0, 'Bac Elmer': 0, 'Banpais': 0,
      'Atlantida': 0, 'Ficohsa': 0, 'Davivienda': 0, 'Occidente': 0
    },
    abonosList: []
  });

  useEffect(() => {
    fetchGastosYCierres();
  }, []);

  const fetchGastosYCierres = async () => {
    try {
      setLoading(true);
      // Traer gastos recientes para la tabla
      const qGastos = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(20));
      const snapGastos = await getDocs(qGastos);
      setGastos(snapGastos.docs.map(d => ({ id: d.id, ...d.data() })));

      // Traer historial de cierres
      const qCierres = query(collection(db, 'dailyClosings'), orderBy('createdAt', 'desc'), limit(10));
      const snapCierres = await getDocs(qCierres);
      setCierres(snapCierres.docs.map(d => ({ id: d.id, ...d.data() })));

      await calcularTotalesDelDia();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalesDelDia = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = Timestamp.fromDate(today);

    // 1. Órdenes de Hoy (Ventas)
    const qOrders = query(collection(db, 'orders'), where('createdAt', '>=', startOfToday));
    const snapOrders = await getDocs(qOrders);
    
    // 2. Abonos de Hoy (Receipts)
    const qReceipts = query(collection(db, 'receipts'), where('createdAt', '>=', startOfToday));
    const snapReceipts = await getDocs(qReceipts);

    // 3. Gastos de Hoy (Expenses)
    const qExp = query(collection(db, 'expenses'), where('createdAt', '>=', startOfToday));
    const snapExp = await getDocs(qExp);

    let stats = {
      ventaTotal: 0, creditoOtorgado: 0,
      efectivoVentas: 0, transferenciasVentas: 0,
      abonosEfectivo: 0, abonosTransferencia: 0,
      gastosOperativos: 0, gastosTerceros: 0, pagosRepartidores: 0,
      enviosTransferencia: 0,
      efectivoEsperado: 0, depositosTotal: 0,
      bancos: { 'Bac Antony': 0, 'Bac Delmy': 0, 'Bac Elmer': 0, 'Banpais': 0, 'Atlantida': 0, 'Ficohsa': 0, 'Davivienda': 0, 'Occidente': 0 },
      abonosList: []
    };

    let pending = false;

    snapOrders.forEach(doc => {
      const o = doc.data();
      if (o.estadoCocina === 'CANCELADA' || o.estadoPago === 'CANCELADO' || o.estado === 'CANCELADA') return;

      if (o.estadoCocina !== 'ENTREGADO' || o.estadoPago === 'PENDIENTE') {
        pending = true;
      }

      const food = o.foodTotal !== undefined ? o.foodTotal : (o.total - (o.deliveryFee || 0));
      stats.ventaTotal += food;

      if (o.estadoPago === 'CREDITO') {
        stats.creditoOtorgado += food;
      } else if (o.metodoPago === 'EFECTIVO') {
        if (o.orderType === 'ENVIO_COBRADO') {
           stats.efectivoVentas += food; // Solo entra a caja el pago de comida (el repartidor se queda su parte)
        } else {
           stats.efectivoVentas += (o.total || 0); // Entra el total a caja
        }
      } else if (o.metodoPago === 'TRANSFERENCIA') {
        let depositToBank = o.total || 0;
        
        if (o.orderType === 'ENVIO_COBRADO') {
           if (o.deliveryPaidByTransfer) {
              // El cliente depositó todo al banco (comida + envío)
              stats.enviosTransferencia += (o.deliveryFee || 0);
           } else {
              // El cliente depositó SOLO la comida al banco
              depositToBank = food;
           }
        }
        
        // Para el cuadre de "Ventas del Día", solo tomamos en cuenta la comida
        stats.transferenciasVentas += food; 
        
        const bankName = o.banco || o.paymentBank;
        if (bankName && stats.bancos[bankName] !== undefined) {
          stats.bancos[bankName] += depositToBank; // El banco sí recibe el depósito completo si aplicaba
        }
      }
    });

    snapReceipts.forEach(doc => {
      const r = doc.data();
      stats.abonosList.push(r);
      if (r.metodoPago === 'EFECTIVO') {
        stats.abonosEfectivo += r.amount;
      } else if (r.metodoPago === 'TRANSFERENCIA') {
        stats.abonosTransferencia += r.amount;
        if (r.paymentBank && stats.bancos[r.paymentBank] !== undefined) {
          stats.bancos[r.paymentBank] += r.amount;
        }
      }
    });

    snapExp.forEach(doc => {
      const e = doc.data();
      if (e.isThirdParty) {
        if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
          stats.pagosRepartidores += e.amount;
        } else {
          stats.gastosTerceros += e.amount;
        }
      } else {
        stats.gastosOperativos += e.amount;
      }
    });

    stats.depositosTotal = stats.transferenciasVentas + stats.abonosTransferencia + stats.enviosTransferencia;
    const totalEfectivoEntrante = stats.efectivoVentas + stats.abonosEfectivo;
    const totalSalidas = stats.gastosOperativos + stats.gastosTerceros + stats.pagosRepartidores;
    stats.efectivoEsperado = totalEfectivoEntrante - totalSalidas;

    setCierreStats(stats);
    setHasPendingOrders(pending);
  };

  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (gastoData.amount <= 0) return toast.error("El monto debe ser válido.");
    
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: Number(gastoData.amount),
        reason: gastoData.reason,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      await logAuditAction('NUEVO_GASTO', 'CAJA', `L. ${gastoData.amount} por ${gastoData.reason}`, currentUser);
      
      setShowGastoModal(false);
      setGastoData({ amount: 0, reason: '' });
      fetchGastosYCierres();
    } catch (error) {
      console.error("Error guardando el gasto:", error);
    }
  };

  const handleCierreCaja = async (e) => {
    e.preventDefault();
    const diff = Number(cierreData.actualCash) - cierreStats.efectivoEsperado;
    
    try {
      await addDoc(collection(db, 'dailyClosings'), {
        expectedCash: cierreStats.efectivoEsperado,
        actualCash: Number(cierreData.actualCash),
        difference: diff,
        stats: cierreStats, // Guardar la radiografía completa del día
        notes: cierreData.notes,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      await logAuditAction('CIERRE_CAJA', 'CAJA', `Cierre realizado. Diferencia: L. ${diff}`, currentUser);
      
      setShowCierreModal(false);
      setCierreData({ actualCash: 0, notes: '' });
      fetchGastosYCierres();
      toast.error(`Cierre registrado. Diferencia de caja: L. ${diff}`);
    } catch (error) {
      console.error("Error realizando el cierre:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toMillis()).toLocaleString();
  };

  return (
    <div className="gastos-container">
      <div className="gastos-header">
        <h1><Wallet size={28} /> Gastos y Cierre de Caja</h1>
        <div className="header-actions-group">
          <button className="btn-secondary danger-text" onClick={() => setShowGastoModal(true)}>
            <TrendingDown size={18} /> Registrar Gasto
          </button>
          <button className="btn-primary highlight-btn" onClick={() => setShowCierreModal(true)}>
            <CheckSquare size={18} /> Realizar Cierre Diario
          </button>
        </div>
      </div>

      <div className="gastos-content">
        <div className="card gastos-list-card">
          <h2><TrendingDown size={20}/> Últimos Gastos</h2>
          {loading ? <p>Cargando...</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Motivo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map(g => (
                  <tr key={g.id}>
                    <td>{formatDate(g.createdAt)}</td>
                    <td>{g.reason} {g.isThirdParty && <span className="badge" style={{backgroundColor: '#3B82F6', color: 'white', fontSize: '0.7rem', padding: '2px 6px', marginLeft: '5px'}}>Pago a Terceros</span>}</td>
                    <td className="danger-text">L. {g.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {gastos.length === 0 && <tr><td colSpan="3" style={{textAlign:'center'}}>No hay gastos recientes</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="card cierres-list-card">
          <h2><History size={20}/> Historial de Cierres</h2>
          {loading ? <p>Cargando...</p> : (
            <div className="cierres-list">
              {cierres.map(c => (
                <div key={c.id} className="cierre-item" onClick={() => setSelectedCierre(c)} style={{cursor: 'pointer', transition: 'background 0.2s'}} title="Ver detalle del cierre">
                  <div className="cierre-info">
                    <strong>Fecha:</strong> {formatDate(c.createdAt)} <br/>
                    <span className="cierre-notes">{c.notes}</span>
                  </div>
                  <div className="cierre-stats">
                    <span>Efectivo Físico: <b>L. {c.actualCash.toFixed(2)}</b></span>
                    <span className={c.difference < 0 ? 'danger-text' : c.difference > 0 ? 'success-text' : ''}>
                      Dif: {c.difference > 0 ? '+' : ''}{c.difference.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {cierres.length === 0 && <p>No hay cierres registrados aún.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Gasto */}
      {showGastoModal && (
        <div className="modal-overlay">
          <div className="modal-card card">
            <h2>Registrar Salida / Gasto</h2>
            <form onSubmit={handleSaveGasto} className="modal-form">
              <div className="form-group">
                <label>Monto (L.)</label>
                <input type="number" className="input-field" required min="1" step="0.01"
                  value={gastoData.amount} onChange={e => setGastoData({...gastoData, amount: Number(e.target.value)})} 
                />
              </div>
              <div className="form-group">
                <label>Motivo del gasto (Ej: Compra de tomate, Pago de agua)</label>
                <input type="text" className="input-field" required 
                  value={gastoData.reason} onChange={e => setGastoData({...gastoData, reason: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowGastoModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{backgroundColor: 'var(--danger-color)'}}>
                  Registrar Salida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cierre Diario - Formato Exacto */}
      {showCierreModal && (
        <div className="modal-overlay" style={{padding: '1rem'}}>
          <div className="modal-card card" style={{maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
              <h2>Reporte de Cierre de Caja</h2>
              <button className="icon-btn" style={{fontSize: '1.5rem'}} onClick={() => setShowCierreModal(false)}><X size={24} /></button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', color: '#000'}}>
              
              {/* SECCION 1: VENTAS DE HOY */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#e3f2fd', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>1. Cuadre de Ventas del Día (Total: L. {cierreStats.ventaTotal.toFixed(2)})</h3>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas cobradas en Efectivo:</span>
                    <span>L. {cierreStats.efectivoVentas.toFixed(2)}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas cobradas en Bancos:</span>
                    <span>L. {cierreStats.transferenciasVentas.toFixed(2)}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas dadas al Crédito:</span>
                    <span>L. {cierreStats.creditoOtorgado.toFixed(2)}</span>
                  </div>
                  <div style={{textAlign: 'right', fontSize: '0.85rem', marginTop: '0.5rem', borderTop: '1px dashed #ccc', paddingTop: '0.25rem', color: (Math.abs(cierreStats.efectivoVentas + cierreStats.transferenciasVentas + cierreStats.creditoOtorgado - cierreStats.ventaTotal) < 0.01) ? 'green' : 'red'}}>
                    Suma desglose: L. {(cierreStats.efectivoVentas + cierreStats.transferenciasVentas + cierreStats.creditoOtorgado).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* SECCION 2: ABONOS DE HOY */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{backgroundColor: '#e8f5e9', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <h3 style={{margin: 0}}>2. Abonos Recibidos (L. {(cierreStats.abonosEfectivo + cierreStats.abonosTransferencia).toFixed(2)})</h3>
                   <button type="button" className="btn-secondary" style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}} onClick={() => setShowAbonosDetalleModal(true)}>Ver Detalles</button>
                </div>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Abonos recibidos en Efectivo:</span>
                    <span>L. {cierreStats.abonosEfectivo.toFixed(2)}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Abonos recibidos en Banco:</span>
                    <span>L. {cierreStats.abonosTransferencia.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SECCION 3: SALIDAS Y GASTOS */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#ffebee', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>3. Salidas de Efectivo (Total: L. {(cierreStats.gastosOperativos + cierreStats.gastosTerceros + cierreStats.pagosRepartidores).toFixed(2)})</h3>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Gastos Operativos:</span>
                    <span className="danger-text">L. {cierreStats.gastosOperativos.toFixed(2)}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Pagos a Terceros (Varios):</span>
                    <span className="danger-text">L. {cierreStats.gastosTerceros.toFixed(2)}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Pagos a Repartidores (Delivery):</span>
                    <span className="danger-text">L. {cierreStats.pagosRepartidores.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SECCION 4: GRAN TOTAL A CUADRAR */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#fff3e0', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>4. Totales Financieros (Lo que debe haber)</h3>
                <div style={{padding: '1rem', backgroundColor: '#fff'}}>
                  <div style={{backgroundColor: 'rgba(255,152,0,0.1)', padding: '1rem', border: '1px solid #ff9800', marginBottom: '1rem', borderRadius: '4px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem'}}>
                       <span>EFECTIVO A ENTREGAR:</span>
                       <span>L. {cierreStats.efectivoEsperado.toFixed(2)}</span>
                     </div>
                     <div style={{fontSize: '0.8rem', color: '#555', marginTop: '0.2rem'}}>
                       (Ventas L. {cierreStats.efectivoVentas.toFixed(2)} + Abonos L. {cierreStats.abonosEfectivo.toFixed(2)} - Salidas L. {(cierreStats.gastosOperativos + cierreStats.gastosTerceros + cierreStats.pagosRepartidores).toFixed(2)})
                     </div>
                  </div>

                  <div style={{backgroundColor: 'rgba(33,150,243,0.1)', padding: '1rem', border: '1px solid #2196f3', borderRadius: '4px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem'}}>
                       <span>TOTAL EN BANCOS:</span>
                       <span>L. {cierreStats.depositosTotal.toFixed(2)}</span>
                     </div>
                     <div style={{fontSize: '0.8rem', color: '#555', marginTop: '0.2rem', marginBottom: '0.5rem'}}>
                       (Ventas L. {cierreStats.transferenciasVentas.toFixed(2)} + Abonos L. {cierreStats.abonosTransferencia.toFixed(2)}{cierreStats.enviosTransferencia > 0 ? ` + Envíos Depositados L. ${cierreStats.enviosTransferencia.toFixed(2)}` : ''})
                     </div>
                     
                     <div style={{borderTop: '1px dashed #2196f3', paddingTop: '0.5rem'}}>
                        {Object.entries(cierreStats.bancos).filter(([k,v]) => v > 0).map(([banco, monto]) => (
                          <div key={banco} style={{display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0'}}>
                             <span>{banco}:</span>
                             <span>L. {monto.toFixed(2)}</span>
                          </div>
                        ))}
                        {Object.values(cierreStats.bancos).every(v => v === 0) && (
                          <div style={{textAlign: 'center', color: '#777', fontSize: '0.9rem'}}>No hubo transferencias hoy</div>
                        )}
                     </div>
                  </div>
                </div>
              </div>

            </div>

            <form onSubmit={handleCierreCaja} style={{marginTop: '2rem'}}>
              <div style={{padding: '1rem', backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: '8px', border: '1px solid #FF9800', marginBottom: '1rem'}}>
                <p style={{margin: '0 0 0.5rem 0', fontWeight: 'bold', textAlign: 'center'}}>Cuadre Físico</p>
                <p style={{textAlign: 'center', margin: '0 0 1rem 0', fontSize: '1.2rem'}}>Efectivo Esperado: <strong>L. {cierreStats.efectivoEsperado.toFixed(2)}</strong></p>
                
                <div className="form-group">
                  <label style={{textAlign: 'center', display: 'block'}}>Efectivo Físico Contado (L.)</label>
                  <input type="number" className="input-field" required min="0" step="0.01" style={{textAlign: 'center', fontSize: '1.5rem', padding: '0.5rem'}}
                    value={cierreData.actualCash} onChange={e => setCierreData({...cierreData, actualCash: Number(e.target.value)})} 
                  />
                </div>
                
                {cierreData.actualCash > 0 && (
                  <div style={{textAlign: 'center', marginTop: '1rem', fontSize: '1.2rem'}}>
                    Diferencia: 
                    <strong className={(cierreData.actualCash - cierreStats.efectivoEsperado) < 0 ? 'danger-text' : 'success-text'}>
                       {` L. ${(cierreData.actualCash - cierreStats.efectivoEsperado).toFixed(2)}`}
                    </strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Observaciones / Comentarios</label>
                <textarea className="input-field" rows="2"
                  value={cierreData.notes} onChange={e => setCierreData({...cierreData, notes: e.target.value})} 
                  placeholder="Justificación si hay diferencia..."
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCierreModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary highlight-btn" style={{flex: 2}} disabled={hasPendingOrders}>
                  {hasPendingOrders ? 'Hay Pedidos Pendientes' : 'Confirmar Cierre Diario'}
                </button>
              </div>
              {hasPendingOrders && (
                <p style={{color: '#FF5252', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center'}}>
                  No puedes realizar el cierre porque aún tienes pedidos pendientes de entrega o pendientes de pago en el día.
                </p>
              )}
            </form>
          </div>
        </div>
      )}



      {/* Modal Historial Cierre Detalle */}
      {selectedCierre && selectedCierre.stats && (
        <div className="modal-overlay" style={{padding: '1rem', zIndex: 1000}}>
          <div className="modal-card card" style={{maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'}}>
              <div>
                 <h2>Detalle de Cierre</h2>
                 <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0}}>{formatDate(selectedCierre.createdAt)}</p>
              </div>
              <button className="icon-btn" style={{fontSize: '1.5rem'}} onClick={() => setSelectedCierre(null)}><X size={24} /></button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', color: '#000'}}>
              
              {/* SECCION 1: VENTAS */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#e3f2fd', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>1. Cuadre de Ventas del Día (Total: L. {selectedCierre.stats.ventaTotal?.toFixed(2) || '0.00'})</h3>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas cobradas en Efectivo:</span>
                    <span>L. {selectedCierre.stats.efectivoVentas?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas cobradas en Bancos:</span>
                    <span>L. {selectedCierre.stats.transferenciasVentas?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Ventas dadas al Crédito:</span>
                    <span>L. {selectedCierre.stats.creditoOtorgado?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* SECCION 2: ABONOS */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{backgroundColor: '#e8f5e9', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <h3 style={{margin: 0}}>2. Abonos Recibidos (L. {((selectedCierre.stats.abonosEfectivo || 0) + (selectedCierre.stats.abonosTransferencia || 0)).toFixed(2)})</h3>
                </div>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Abonos recibidos en Efectivo:</span>
                    <span>L. {selectedCierre.stats.abonosEfectivo?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Abonos recibidos en Banco:</span>
                    <span>L. {selectedCierre.stats.abonosTransferencia?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* SECCION 3: SALIDAS Y GASTOS */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#ffebee', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>3. Salidas de Efectivo (Total: L. {((selectedCierre.stats.gastosOperativos || 0) + (selectedCierre.stats.gastosTerceros || 0) + (selectedCierre.stats.pagosRepartidores || 0)).toFixed(2)})</h3>
                <div style={{padding: '0.5rem', backgroundColor: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Gastos Operativos:</span>
                    <span className="danger-text">L. {selectedCierre.stats.gastosOperativos?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Pagos a Terceros (Varios):</span>
                    <span className="danger-text">L. {selectedCierre.stats.gastosTerceros?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0'}}>
                    <span>Pagos a Repartidores (Delivery):</span>
                    <span className="danger-text">L. {selectedCierre.stats.pagosRepartidores?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* SECCION 4: GRAN TOTAL A CUADRAR */}
              <div style={{border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden'}}>
                <h3 style={{backgroundColor: '#fff3e0', margin: 0, padding: '0.5rem', borderBottom: '1px solid #ccc'}}>4. Totales Financieros (Lo que debe haber)</h3>
                <div style={{padding: '1rem', backgroundColor: '#fff'}}>
                  <div style={{backgroundColor: 'rgba(255,152,0,0.1)', padding: '1rem', border: '1px solid #ff9800', marginBottom: '1rem', borderRadius: '4px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem'}}>
                       <span>EFECTIVO A ENTREGAR:</span>
                       <span>L. {selectedCierre.stats.efectivoEsperado?.toFixed(2) || '0.00'}</span>
                     </div>
                  </div>

                  <div style={{backgroundColor: 'rgba(33,150,243,0.1)', padding: '1rem', border: '1px solid #2196f3', borderRadius: '4px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem'}}>
                       <span>TOTAL EN BANCOS:</span>
                       <span>L. {selectedCierre.stats.depositosTotal?.toFixed(2) || '0.00'}</span>
                     </div>
                     <div style={{borderTop: '1px dashed #2196f3', paddingTop: '0.5rem', marginTop: '0.5rem'}}>
                        {selectedCierre.stats.bancos && Object.entries(selectedCierre.stats.bancos).filter(([k,v]) => v > 0).map(([banco, monto]) => (
                          <div key={banco} style={{display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0'}}>
                             <span>{banco}:</span>
                             <span>L. {monto.toFixed(2)}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>

              {/* CUADRE FINAL */}
              <div style={{padding: '1rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px', border: '1px solid #ccc', marginTop: '1rem'}}>
                <h3 style={{margin: '0 0 1rem 0', textAlign: 'center'}}>Cuadre Físico Reportado</h3>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginBottom: '0.5rem'}}>
                  <span>Efectivo Físico Contado:</span>
                  <strong>L. {selectedCierre.actualCash?.toFixed(2) || '0.00'}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem'}}>
                  <span>Diferencia (Sobrante/Faltante):</span>
                  <strong className={(selectedCierre.difference || 0) < 0 ? 'danger-text' : 'success-text'}>
                    L. {selectedCierre.difference?.toFixed(2) || '0.00'}
                  </strong>
                </div>
                {selectedCierre.notes && (
                  <div style={{marginTop: '1rem', padding: '0.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px'}}>
                    <strong>Observaciones: </strong>
                    <span>{selectedCierre.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions" style={{marginTop: '2rem'}}>
              <button type="button" className="btn-secondary" style={{width: '100%'}} onClick={() => setSelectedCierre(null)}>Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}
      {showAbonosDetalleModal && (
        <div className="modal-overlay" style={{zIndex: 999}}>
          <div className="modal-card card" style={{maxWidth: '500px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h2>Abonos a Crédito (Hoy)</h2>
              <button className="icon-btn" onClick={() => setShowAbonosDetalleModal(false)}><X size={20}/></button>
            </div>
            
            {cierreStats.abonosList.length === 0 ? (
              <p>No se han registrado abonos el día de hoy.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {cierreStats.abonosList.map((a, i) => (
                  <div key={i} style={{padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <strong>{a.clientName}</strong>
                      <strong className="success-text">L. {a.amount.toFixed(2)}</strong>
                    </div>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>
                      Recibo: {a.id} | Método: {a.metodoPago} {a.paymentBank ? `(${a.paymentBank})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="btn-secondary" style={{width: '100%', marginTop: '1rem'}} onClick={() => setShowAbonosDetalleModal(false)}>Volver al Cierre</button>
          </div>
        </div>
      )}
    </div>
  );
}
