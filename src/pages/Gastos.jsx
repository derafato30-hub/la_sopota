import { useState, useEffect } from 'react';
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

  // Formularios
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoData, setGastoData] = useState({ amount: 0, reason: '' });

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [cierreData, setCierreData] = useState({ actualCash: 0, notes: '' });

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
      gastosOperativos: 0, gastosTerceros: 0,
      efectivoEsperado: 0, depositosTotal: 0,
      bancos: { 'Bac Antony': 0, 'Bac Delmy': 0, 'Bac Elmer': 0, 'Banpais': 0, 'Atlantida': 0, 'Ficohsa': 0, 'Davivienda': 0, 'Occidente': 0 },
      abonosList: []
    };

    snapOrders.forEach(doc => {
      const o = doc.data();
      if (o.estado === 'CANCELADA') return;

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
        let amt = o.total || 0;
        
        // Si fue envío cobrado por transferencia
        if (o.orderType === 'ENVIO_COBRADO') {
           if (o.deliveryPaidByTransfer) {
              // El cliente depositó todo (comida + envío)
              // El banco recibe el total, pero la caja de efectivo DEBE pagarle al repartidor
              stats.gastosOperativos += (o.deliveryFee || 0); 
           } else {
              // El cliente depositó SOLO la comida, y le dio el efectivo al repartidor
              amt = food; // El banco solo recibe el valor de la comida
           }
        }
        
        stats.transferenciasVentas += amt;
        const bankName = o.banco || o.paymentBank;
        if (bankName && stats.bancos[bankName] !== undefined) {
          stats.bancos[bankName] += amt;
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
        stats.gastosTerceros += e.amount;
      } else {
        stats.gastosOperativos += e.amount;
      }
    });

    stats.depositosTotal = stats.transferenciasVentas + stats.abonosTransferencia;
    const totalEfectivoEntrante = stats.efectivoVentas + stats.abonosEfectivo;
    const totalSalidas = stats.gastosOperativos + stats.gastosTerceros;
    stats.efectivoEsperado = totalEfectivoEntrante - totalSalidas;

    setCierreStats(stats);
  };

  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (gastoData.amount <= 0) return alert("El monto debe ser válido.");
    
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
      alert(`Cierre registrado. Diferencia de caja: L. ${diff}`);
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
                <div key={c.id} className="cierre-item">
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
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#fff', border: '1px solid #ccc', color: '#000'}}>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc', fontWeight: 'bold'}}>fecha</div>
                <div style={{flex: 1, padding: '0.5rem'}}>{new Date().toLocaleDateString()}</div>
              </div>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>Venta total (Fiscal)</div>
                <div style={{flex: 1, padding: '0.5rem', fontWeight: 'bold', color: 'var(--primary-color)'}}>L. {cierreStats.ventaTotal.toFixed(2)}</div>
              </div>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>Efectivo (Ventas + Abonos)</div>
                <div style={{flex: 1, padding: '0.5rem'}}>L. {(cierreStats.efectivoVentas + cierreStats.abonosEfectivo).toFixed(2)}</div>
              </div>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>depositos (Ventas + Abonos)</div>
                <div style={{flex: 1, padding: '0.5rem'}}>L. {cierreStats.depositosTotal.toFixed(2)}</div>
              </div>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>gastos (Operativos + Repartidores)</div>
                <div style={{flex: 1, padding: '0.5rem', color: 'var(--danger-color)'}}>L. {(cierreStats.gastosOperativos + cierreStats.gastosTerceros).toFixed(2)}</div>
              </div>
              <div style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>Credito Otorgado Hoy</div>
                <div style={{flex: 1, padding: '0.5rem'}}>L. {cierreStats.creditoOtorgado.toFixed(2)}</div>
              </div>
            </div>

            {/* SECCION ABONOS */}
            <div style={{marginTop: '1rem'}}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'}}
                onClick={() => setShowAbonosDetalleModal(true)}
              >
                <List size={18} /> Ver Detalle de Abonos Recibidos Hoy (L. {(cierreStats.abonosEfectivo + cierreStats.abonosTransferencia).toFixed(2)})
              </button>
            </div>

            {/* DESGLOSE BANCOS */}
            <div style={{marginTop: '1rem', backgroundColor: '#fff', border: '1px solid #ccc', color: '#000'}}>
              <div style={{padding: '0.5rem', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold', textAlign: 'center'}}>
                Desglose de Bancos
              </div>
              {Object.entries(cierreStats.bancos).map(([banco, monto]) => (
                <div key={banco} style={{display: 'flex', borderBottom: '1px solid #ccc'}}>
                  <div style={{flex: 1, padding: '0.5rem', borderRight: '1px solid #ccc'}}>{banco}</div>
                  <div style={{flex: 1, padding: '0.5rem'}}>{monto > 0 ? `L. ${monto.toFixed(2)}` : '-'}</div>
                </div>
              ))}
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
                <button type="submit" className="btn-primary highlight-btn" style={{flex: 2}}>Confirmar Cierre Diario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Abonos */}
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
