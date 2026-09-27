import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, serverTimestamp, query, where, Timestamp, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { TrendingUp, Plus, CreditCard, Filter, ChevronDown, ChevronUp, DollarSign, Users, Briefcase, FileText, Search } from 'lucide-react';
import './Gastos.css'; // Reutilizamos estilos de tarjetas

export default function Finanzas() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('PL'); // PL, REGISTRO, COBRAR
  
  return (
    <div className="pos-container" style={{ padding: '1rem', overflowY: 'auto' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={28} />
            Módulo de Finanzas
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Control de flujo de caja y rentabilidad</p>
        </div>
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('PL')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'PL' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'PL' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Estado de Resultados
        </button>
        <button 
          onClick={() => setActiveTab('REGISTRO')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'REGISTRO' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'REGISTRO' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Registrar Egreso
        </button>
        <button 
          onClick={() => setActiveTab('COBRAR')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'COBRAR' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'COBRAR' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Cuentas por Cobrar
        </button>
      </div>

      {activeTab === 'PL' && <DashboardPL />}
      {activeTab === 'REGISTRO' && <RegistrarEgreso currentUser={currentUser} />}
      {activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}
    </div>
  );
}

// ----------------------------------------------------
// TAB 1: DASHBOARD P&L (Estado de Resultados)
// ----------------------------------------------------
function DashboardPL() {
  const [timeRange, setTimeRange] = useState('HOY'); // HOY, SEMANA, MES, TODO
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    ingresosReales: 0,
    abonos: 0,
    cajaChica: 0,
    operativos: 0,
    nomina: 0,
    administrativos: 0,
    inversiones: 0,
    personales: 0
  });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Determinar fechas
      const now = new Date();
      let startDate = new Date();
      startDate.setHours(0,0,0,0);

      if (timeRange === 'SEMANA') {
        const day = startDate.getDay() || 7; 
        if (day !== 1) startDate.setHours(-24 * (day - 1)); // Lunes
      } else if (timeRange === 'MES') {
        startDate.setDate(1);
      } else if (timeRange === 'TODO') {
        startDate = new Date(2000, 0, 1);
      }

      const endOfDay = new Date();
      endOfDay.setHours(23,59,59,999);

      // Traer facturas pagadas (Cash Basis)
      const invQuery = query(collection(db, 'invoices'), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      const invSnap = await getDocs(invQuery);
      let ingresosCash = 0;
      invSnap.forEach(doc => {
        const d = doc.data();
        if (d.estado !== 'ANULADA') {
          if (d.metodoPago !== 'CREDITO' && d.metodoPago !== 'MULTIPLE') {
            ingresosCash += d.total || 0;
          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
            d.pagosMultiples.forEach(p => {
              if(p.method !== 'CREDITO') ingresosCash += p.amount;
            });
          }
        }
      });

      // Traer Abonos
      const abnQuery = query(collection(db, 'creditPayments'), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      const abnSnap = await getDocs(abnQuery);
      let totalAbonos = 0;
      abnSnap.forEach(doc => totalAbonos += doc.data().amount || 0);

      // Traer Gastos (Caja Chica + Finanzas)
      const expQuery = query(collection(db, 'expenses'), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      const expSnap = await getDocs(expQuery);
      
      let cc = 0, op = 0, nom = 0, adm = 0, inv = 0, per = 0;
      
      expSnap.forEach(doc => {
        const d = doc.data();
        const amt = d.amount || 0;
        switch(d.category) {
          case 'CAJA_CHICA': cc += amt; break;
          case 'INVENTARIO': op += amt; break;
          case 'NOMINA': nom += amt; break;
          case 'ADMINISTRATIVO': adm += amt; break;
          case 'INVERSION': inv += amt; break;
          case 'PERSONAL': per += amt; break;
          default: cc += amt; // Legacy fallback
        }
      });

      setData({
        ingresosReales: ingresosCash,
        abonos: totalAbonos,
        cajaChica: cc,
        operativos: op,
        nomina: nom,
        administrativos: adm,
        inversiones: inv,
        personales: per
      });

    } catch (e) {
      console.error(e);
      toast.error('Error calculando finanzas');
    } finally {
      setLoading(false);
    }
  };

  const ingresosTotales = data.ingresosReales + data.abonos;
  const gastosRestables = data.cajaChica + data.operativos + data.nomina + data.administrativos;
  const flujoNeto = ingresosTotales - gastosRestables;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" style={{ flex: 1, border: timeRange === 'HOY' ? '2px solid var(--primary-color)' : '' }} onClick={() => setTimeRange('HOY')}>Hoy</button>
        <button className="btn-secondary" style={{ flex: 1, border: timeRange === 'SEMANA' ? '2px solid var(--primary-color)' : '' }} onClick={() => setTimeRange('SEMANA')}>Esta Semana</button>
        <button className="btn-secondary" style={{ flex: 1, border: timeRange === 'MES' ? '2px solid var(--primary-color)' : '' }} onClick={() => setTimeRange('MES')}>Este Mes</button>
        <button className="btn-secondary" style={{ flex: 1, border: timeRange === 'TODO' ? '2px solid var(--primary-color)' : '' }} onClick={() => setTimeRange('TODO')}>Todo</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>Calculando...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          
          <div className="stat-card" style={{ borderColor: '#4CAF50' }}>
            <div className="stat-header">
              <DollarSign color="#4CAF50" size={24}/>
              <h3>Ingresos (Flujo de Caja)</h3>
            </div>
            <div className="stat-value" style={{ color: '#4CAF50' }}>L. {ingresosTotales.toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Ventas de Contado: L. {data.ingresosReales.toFixed(2)}<br/>
              Abonos Recibidos: L. {data.abonos.toFixed(2)}
            </div>
          </div>

          <div className="stat-card" style={{ borderColor: '#f44336' }}>
            <div className="stat-header">
              <TrendingUp color="#f44336" size={24} style={{ transform: 'rotate(180deg)' }}/>
              <h3>Egresos Operativos</h3>
            </div>
            <div className="stat-value" style={{ color: '#f44336' }}>L. {gastosRestables.toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Caja Chica Diario: L. {data.cajaChica.toFixed(2)}<br/>
              Inventario Mayor: L. {data.operativos.toFixed(2)}<br/>
              Nómina/Sueldos: L. {data.nomina.toFixed(2)}<br/>
              Administrativos: L. {data.administrativos.toFixed(2)}
            </div>
          </div>

          <div className="stat-card" style={{ borderColor: flujoNeto >= 0 ? '#2196F3' : '#f44336', gridColumn: '1 / -1' }}>
            <div className="stat-header">
              <Briefcase color={flujoNeto >= 0 ? '#2196F3' : '#f44336'} size={24}/>
              <h3>Flujo Neto (Ganancia Operativa)</h3>
            </div>
            <div className="stat-value" style={{ color: flujoNeto >= 0 ? '#2196F3' : '#f44336', fontSize: '2.5rem' }}>
              L. {flujoNeto.toFixed(2)}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Este es el dinero real disponible generado por la operación del restaurante en este periodo.
            </p>
          </div>

          <div className="stat-card" style={{ borderColor: '#ff9800' }}>
            <div className="stat-header">
              <Plus color="#ff9800" size={24}/>
              <h3>Inversión (Capital)</h3>
            </div>
            <div className="stat-value" style={{ color: '#ff9800' }}>L. {data.inversiones.toFixed(2)}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No afecta el Flujo Neto Operativo.</p>
          </div>

          <div className="stat-card" style={{ borderColor: '#9C27B0' }}>
            <div className="stat-header">
              <Users color="#9C27B0" size={24}/>
              <h3>Retiros Personales</h3>
            </div>
            <div className="stat-value" style={{ color: '#9C27B0' }}>L. {data.personales.toFixed(2)}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fugas de capital no deducibles.</p>
          </div>

        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// TAB 2: REGISTRAR EGRESO (BACKOFFICE)
// ----------------------------------------------------
function RegistrarEgreso({ currentUser }) {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'INVENTARIO',
    source: 'EFECTIVO', // EFECTIVO, BAC, BANPAIS, ETC
    reason: '',
    date: new Date().toISOString().substring(0, 10)
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.amount <= 0) return toast.error("El monto debe ser válido");
    if (!formData.reason.trim()) return toast.error("Ingrese un motivo");

    setSaving(true);
    try {
      const parts = formData.date.split('-');
      const expenseDate = new Date(parts[0], parts[1]-1, parts[2], 12, 0, 0);

      await addDoc(collection(db, 'expenses'), {
        amount: Number(formData.amount),
        category: formData.category,
        source: formData.source,
        reason: formData.reason,
        createdBy: currentUser.uid,
        createdAt: Timestamp.fromDate(expenseDate)
      });

      await logAuditAction('NUEVO_EGRESO_BACKOFFICE', 'FINANZAS', `L. ${formData.amount} por ${formData.reason} (${formData.category})`, currentUser);
      toast.success('Egreso guardado exitosamente');
      setFormData({ ...formData, amount: '', reason: '' });
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar egreso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-cierre" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Registrar Egreso / Inversión</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div>
          <label>Categoría Financiera</label>
          <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
            <option value="INVENTARIO">1. Costo de Venta (Inventario Mayor)</option>
            <option value="NOMINA">2. Nómina (Pago a Empleados)</option>
            <option value="ADMINISTRATIVO">3. Gastos Generales (Luz, Agua, Gasolina)</option>
            <option value="INVERSION">4. Inversión (Activos, Equipo, Remodelación)</option>
            <option value="PERSONAL">5. Retiro Personal / No del Negocio</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label>Monto (L.)</label>
            <input type="number" className="input-field" required min="1" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Fecha de Aplicación</label>
            <input type="date" className="input-field" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
        </div>

        <div>
          <label>Cuenta de Origen</label>
          <select className="input-field" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
            <option value="EFECTIVO">Efectivo de Gerencia</option>
            <option value="BAC ANTONY">BAC Antony</option>
            <option value="BANPAIS">Banpais</option>
            <option value="OTRA">Otra Transferencia / Tarjeta</option>
          </select>
        </div>

        <div>
          <label>Descripción / Motivo</label>
          <input type="text" className="input-field" required placeholder="Ej: Compra pollo semana 40" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Registrar Salida de Dinero'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------
// TAB 3: CUENTAS POR COBRAR
// ----------------------------------------------------
function CuentasPorCobrar({ currentUser }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebtors();
  }, []);

  const fetchDebtors = async () => {
    try {
      // Filtrar clientes con saldo > 0 (No se puede hacer con where directamente si no todos tienen el campo, pero probemos)
      const q = query(collection(db, 'clients'), where('creditBalance', '>', 0));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setClientes(list);
    } catch (e) {
      console.error(e);
      // Fallback
      const snap = await getDocs(collection(db, 'clients'));
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.creditBalance > 0) list.push({ id: d.id, ...data });
      });
      setClientes(list);
    } finally {
      setLoading(false);
    }
  };

  const totalDeuda = clientes.reduce((acc, c) => acc + (c.creditBalance || 0), 0);

  return (
    <div>
      <div className="stat-card" style={{ borderColor: '#ff9800', marginBottom: '1.5rem', maxWidth: '400px' }}>
        <div className="stat-header">
          <FileText color="#ff9800" size={24}/>
          <h3>Dinero en la Calle (Por Cobrar)</h3>
        </div>
        <div className="stat-value" style={{ color: '#ff9800' }}>L. {totalDeuda.toFixed(2)}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Este dinero no entra al P&L hasta que sea pagado.</p>
      </div>

      <div className="table-container">
        {loading ? <p>Cargando...</p> : (
          <table className="pos-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Saldo Pendiente</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay cuentas por cobrar activas.</td></tr>
              ) : (
                clientes.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td style={{ color: '#f44336', fontWeight: 'bold' }}>L. {c.creditBalance.toFixed(2)}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '0.4rem' }} onClick={() => toast.info('Para registrar un abono, ve a la pestaña "Clientes".')}>
                        Registrar Abono
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
