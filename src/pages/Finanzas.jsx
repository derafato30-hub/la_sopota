import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, setDoc, serverTimestamp, onSnapshot, where, runTransaction, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrendingUp, Wallet, ArrowRightLeft, FileText, CheckSquare, Plus, Activity, History, Cpu } from 'lucide-react';

const SEED_ACCOUNTS = [
  { id: 'efectivo_caja', name: 'Efectivo Caja', type: 'CASH', balance: 0 },
  { id: 'bac_elmer', name: 'BAC Elmer', type: 'BANK', balance: 0 },
  { id: 'bac_antony', name: 'BAC Antony', type: 'BANK', balance: 0 },
  { id: 'banco_atlantida', name: 'Banco Atlántida', type: 'BANK', balance: 0 },
  { id: 'cxp_pollo', name: 'CxP Pollo Norteño', type: 'PAYABLE', balance: 0 }
];

function HistorialTab({ accounts }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'fin_transactions'), orderBy('date', 'desc'), limit(300));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {
      console.error(e);
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));

  const filtered = transactions.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (dateRange.start) {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      if (d < new Date(dateRange.start + 'T00:00:00')) return false;
    }
    if (dateRange.end) {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      if (d > new Date(dateRange.end + 'T23:59:59')) return false;
    }
    return true;
  });

  const getAccountName = (id) => {
    if (!id) return '-';
    return accounts.find(a => a.id === id)?.name || id;
  };

  const getBadgeColor = (type) => {
    if (type === 'IN') return '#4CAF50';
    if (type === 'OUT') return '#FF5252';
    return '#2196F3';
  };

  return (
    <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📖 Historial Auditable (Ledger)</h2>
        <button className="btn-secondary" onClick={fetchTransactions} disabled={loading}>
          🔄 Actualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tipo</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
            <option value="ALL">Todas las transacciones</option>
            <option value="IN">Entradas (IN)</option>
            <option value="OUT">Salidas (OUT)</option>
            <option value="TRANSFER">Transferencias (TRANSFER)</option>
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Categoría</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
            <option value="ALL">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Desde</label>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hasta</label>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Fecha</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Tipo</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Monto</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Origen ➡️ Destino</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Categoría</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Descripción / Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando transacciones...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron transacciones para estos filtros.</td></tr>
            ) : (
              filtered.map(t => {
                const dateObj = t.date?.toDate ? t.date.toDate() : new Date();
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                      {dateObj.toLocaleDateString('es-HN')} <br/>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dateObj.toLocaleTimeString('es-HN', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ backgroundColor: getBadgeColor(t.type), color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: t.type === 'IN' ? '#4CAF50' : t.type === 'OUT' ? '#FF5252' : 'inherit' }}>
                      {t.type === 'OUT' ? '-' : ''}L. {t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{getAccountName(t.sourceAccountId)}</span>
                      <br/>⬇️<br/>
                      <span style={{ color: 'var(--text-primary)' }}>{getAccountName(t.destinationAccountId)}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {t.category || 'SIN_CATEGORIA'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {t.description || '-'}
                        {t.metadata?.invoiceId && (
                           <div style={{ fontSize: '0.75rem', color: '#FF9800', marginTop: '0.25rem' }}>
                             {t.metadata.invoiceId}
                           </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Finanzas() {
  const { currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    let syncing = false;
    // Escuchar Cuentas Financieras
    const q = query(collection(db, 'fin_accounts'));
    const unsub = onSnapshot(q, async (snap) => {
      const requiredAccounts = [
        { id: 'efectivo_caja', name: 'Efectivo Caja', type: 'CASH', balance: 0 },
        { id: 'bac_antony', name: 'BAC Antony', type: 'BANK', balance: 0 },
        { id: 'bac_delmy', name: 'BAC Delmy', type: 'BANK', balance: 0 },
        { id: 'bac_elmer', name: 'BAC Elmer', type: 'BANK', balance: 0 },
        { id: 'banpais', name: 'Banpais', type: 'BANK', balance: 0 },
        { id: 'ficohsa', name: 'Ficohsa', type: 'BANK', balance: 0 },
        { id: 'atlantida', name: 'Banco Atlántida', type: 'BANK', balance: 0 },
        { id: 'occidente', name: 'Occidente', type: 'BANK', balance: 0 },
        { id: 'davivienda', name: 'Davivienda', type: 'BANK', balance: 0 },
      ];

      let accs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const existingIds = new Set(accs.map(a => a.id));
      
      const missing = requiredAccounts.filter(a => !existingIds.has(a.id));
      
      if (missing.length > 0 && !syncing) {
        syncing = true;
        try {
          for (const acc of missing) {
            await setDoc(doc(db, 'fin_accounts', acc.id), acc, { merge: true });
          }
        } catch(e) { console.error("Error seeding", e); }
        syncing = false;
      } else {
        setAccounts(accs);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);


  if (!hasPermission('SUPERUSUARIO') && !hasPermission('FINANZAS_MASTER')) {
    return <div style={{padding:'2rem'}}>Acceso Denegado. Se requiere nivel de Finanzas o Superusuario.</div>;
  }

  return (
    <div className="finanzas-container" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItemás: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItemás: 'center', gap: '0.5rem' }}>
            <Wallet size={28} />
            Finanzas y Ledger
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Control contable de doble partida</p>
        </div>
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <TabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<Activity size={18}/>} label="Dashboard" />
        <TabButton active={activeTab === 'CXP'} onClick={() => setActiveTab('CXP')} icon={<FileText size={18}/>} label="Cuentas por Pagar" />
        <TabButton active={activeTab === 'REGISTRAR'} onClick={() => setActiveTab('REGISTRAR')} icon={<Plus size={18}/>} label="Registrar Transacción" />
        <TabButton active={activeTab === 'PL'} onClick={() => setActiveTab('PL')} icon={<TrendingUp size={18}/>} label="Estado de Resultados" />
        <TabButton active={activeTab === 'HISTORIAL'} onClick={() => setActiveTab('HISTORIAL')} icon={<History size={18}/>} label="Historial (Ledger)" />
        <TabButton active={activeTab === 'IA'} onClick={() => setActiveTab('IA')} icon={<Cpu size={18}/>} label="Asistente IA" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? <p>Cargando cuentas...</p> : (
          <>
            {activeTab === 'DASHBOARD' && <DashboardTab accounts={accounts} />}
            {activeTab === 'REGISTRAR' && <RegistrarTab accounts={accounts} currentUser={currentUser} />}
            {activeTab === 'CXP' && <CxPTab accounts={accounts} currentUser={currentUser} />}
            {activeTab === 'PL' && <PLTab />}
            {activeTab === 'HISTORIAL' && <HistorialTab accounts={accounts} />}
            {activeTab === 'IA' && <IATab />}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        padding: '0.75rem 1.5rem', background: 'none', border: 'none', 
        color: active ? 'var(--primary-color)' : 'var(--text-color)', 
        borderBottom: active ? '3px solid var(--primary-color)' : '3px solid transparent', 
        cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItemás: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
      }}
    >
      {icon} {label}
    </button>
  );
}

// ----------------------------------------------------
// TAB 1: DASHBOARD
// ----------------------------------------------------
function DashboardTab({ accounts }) {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const bancosEfectivo = accounts.filter(a => a.type === 'BANK' || a.type === 'CASH');
  const pasivos = accounts.filter(a => a.type === 'PAYABLE');

  const totalActivo = bancosEfectivo.reduce((acc, a) => acc + (a.balance || 0), 0);
  const totalPasivo = pasivos.reduce((acc, a) => acc + (a.balance || 0), 0);

  const loadTransactions = async (accountId) => {
    setLoadingTx(true);
    try {
      const q = query(collection(db, 'fin_transactions'), 
        // We can't do OR queries easily in old firestore without composite indexes, 
        // so we fetch latest 100 and filter in memory, or use multiple queries.
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const allTx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = allTx.filter(tx => tx.sourceAccountId === accountId || tx.destinationAccountId === accountId).slice(0, 50);
      setTransactions(filtered);
    } catch(e) { console.error(e); }
    setLoadingTx(false);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      {/* Columna Izquierda: Cuentas */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ background: 'var(--primary-color)', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>💰 TOTAL ACTIVO</h3>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>L. {totalActivo.toFixed(2)}</h1>
        </div>

        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Bancos y Efectivo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {bancosEfectivo.map(a => (
              <div 
                key={a.id} 
                onClick={() => { setSelectedAccount(a); loadTransactions(a.id); }}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '0.75rem', 
                  background: selectedAccount?.id === a.id ? 'var(--bg-color)' : 'transparent',
                  border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' 
                }}
              >
                <span>{a.type === 'CASH' ? '🟢' : '🏦'} {a.name}</span>
                <strong>L. {(a.balance || 0).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Cuentas por Pagar (Pasivos)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {pasivos.map(a => (
               <div 
                 key={a.id} 
                 onClick={() => { setSelectedAccount(a); loadTransactions(a.id); }}
                 style={{ 
                   display: 'flex', justifyContent: 'space-between', padding: '0.75rem', 
                   background: selectedAccount?.id === a.id ? 'var(--bg-color)' : 'transparent',
                   border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' 
                 }}
               >
                 <span>🔴 {a.name}</span>
                 <strong style={{color: '#f44336'}}>L. {(a.balance || 0).toFixed(2)}</strong>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Libro Mayor */}
      <div style={{ flex: '2 1 500px' }}>
        <div className="card" style={{ height: '100%', minHeight: '500px' }}>
          {!selectedAccount ? (
            <div style={{ display: 'flex', height: '100%', alignItemás: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Selecciona una cuenta para ver su Libro Mayor
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItemás: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--accent-color)', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>{selectedAccount.name} - Libro Mayor</h2>
                <h2 style={{ margin: 0, color: selectedAccount.type === 'PAYABLE' ? '#f44336' : 'var(--primary-color)' }}>
                  Saldo: L. {(selectedAccount.balance || 0).toFixed(2)}
                </h2>
              </div>
              
              {loadingTx ? <p>Cargando transacciones...</p> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th>Ingreso</th>
                      <th>Egreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay movimientos recientes.</td></tr>
                    ) : (
                      transactions.map(tx => {
                        const isIngreso = tx.destinationAccountId === selectedAccount.id;
                        const isEgreso = tx.sourceAccountId === selectedAccount.id;
                        return (
                          <tr key={tx.id}>
                            <td>{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : 'N/A'}</td>
                            <td><span style={{ fontSize: '0.8rem', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>{tx.category}</span></td>
                            <td>{tx.description}</td>
                            <td style={{ color: '#4CAF50', fontWeight: 'bold' }}>{isIngreso ? `L. ${tx.amount.toFixed(2)}` : ''}</td>
                            <td style={{ color: '#f44336', fontWeight: 'bold' }}>{isEgreso ? `L. ${tx.amount.toFixed(2)}` : ''}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ----------------------------------------------------
// TAB 2: REGISTRAR (Manual / IA) UX/UI Moderno
// ----------------------------------------------------
function RegistrarTab({ accounts, currentUser }) {
  const [txType, setTxType] = useState('OUT'); // IN, OUT, TRANSFER
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [sourceAcc, setSourceAcc] = useState('');
  const [destAcc, setDestAcc] = useState('');
  const [loading, setLoading] = useState(false);

  // NLP Asistido
  const [nlpText, setNlpText] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);

  const categoriesOut = [
    { id: 'INVERSION', icon: '📦', label: 'Inversión/Prod.' },
    { id: 'PLANILLA', icon: '👥', label: 'Planilla' },
    { id: 'CAJA_CHICA', icon: '🧾', label: 'Caja Chica' },
    { id: 'CUENTAS_PAGADAS', icon: '💸', label: 'Pago Deuda' },
    { id: 'GASTO_PERSONAL', icon: '🏠', label: 'Personal (Retiro)' },
    { id: 'AJUSTE_NEGATIVO', icon: '⚠️', label: 'Faltante/Pérdida' }
  ];
  
  const categoriesIn = [
    { id: 'VENTA_POS', icon: '🛒', label: 'Venta Diaria' },
    { id: 'CLUB', icon: '🏍️', label: 'Club Cadetes' },
    { id: 'COBRO_CREDITO', icon: '🤝', label: 'Abono Crédito' },
    { id: 'AJUSTE_POSITIVO', icon: '✨', label: 'Sobrante' }
  ];

  const handleNlpAnalyze = async () => {
    if (!nlpText) return;
    setNlpLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      let model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const accountsList = accounts.filter(a => a.type !== 'PAYABLE').map(a => ({ id: a.id, name: a.name }));
      
      const prompt = `
      Eres un asistente contable experto. Analiza el siguiente texto de un usuario y extrae los datos de la transacción financiera.
      Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
      {
        "txType": "IN" o "OUT" o "TRANSFER",
        "amount": número,
        "category": "ID_CATEGORIA" (solo si IN o OUT),
        "desc": "Breve descripción corta del motivo",
        "sourceAccId": "ID_CUENTA" (de donde sale el dinero, null si es IN),
        "destAccId": "ID_CUENTA" (a donde entra el dinero, null si es OUT)
      }

      Cuentas disponibles: ${JSON.stringify(accountsList)}
      
      Categorías de EGRESO (OUT): INVERSION, PLANILLA, CAJA_CHICA, CUENTAS_PAGADAS, GASTO_PERSONAL, AJUSTE_NEGATIVO
      Categorías de INGRESO (IN): VENTA_POS, CLUB, COBRO_CREDITO, AJUSTE_POSITIVO

      Reglas muy estrictas:
      1. Usa inteligencia para deducir la cuenta correcta de la lista de cuentas disponibles. Por ejemplo si dice "atlantida" busca el ID de "Banco Atlántida".
      2. Si compra producto, materia prima (ej. gallinas, pollo, papas), la categoría es INVERSION.
      3. Si transfiere o pasa dinero entre cuentas, el txType es TRANSFER, category es nulo, sourceAccId es de donde sale y destAccId a donde entra.
      4. Si es un pago hacia ellos o un cobro (ej: "me pagaron", "ingresó"), el dinero ENTRA (IN).
      5. "Cuentas pagadas" es cuando ELLOS pagan una deuda a alguien más. Si les pagan a ellos algo que debían, es COBRO_CREDITO.

      Texto del usuario a analizar: "${nlpText}"
      `;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (err) {
        if (err.message && err.message.includes('503')) {
          console.warn('Servidores de Google saturados (503). Intentando con el modelo de respaldo (gemini-pro-latest)...');
          model = genAI.getGenerativeModel({ 
            model: "gemini-pro-latest", 
            generationConfig: { responseMimeType: "application/json" } 
          });
          result = await model.generateContent(prompt);
        } else {
          throw err;
        }
      }
      const text = result.response.text();
      const data = JSON.parse(text);

      if (data.txType) setTxType(data.txType);
      if (data.amount) setAmount(data.amount);
      if (data.category) setCategory(data.category);
      if (data.desc) setDesc(data.desc);
      if (data.sourceAccId) setSourceAcc(data.sourceAccId);
      if (data.destAccId) setDestAcc(data.destAccId);

      toast.success('✨ IA: ¡Formulario autocompletado con éxito!');
    } catch (error) {
      console.error("NLP Error:", error);
      toast.error('Error al analizar el texto con IA. Revisa tu consola.');
    }
    setNlpLoading(false);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Monto inválido');
    if (txType === 'IN' && !destAcc) return toast.error('Selecciona cuenta destino');
    if (txType === 'OUT' && !sourceAcc) return toast.error('Selecciona cuenta origen');
    if (txType === 'TRANSFER' && (!sourceAcc || !destAcc || sourceAcc === destAcc)) return toast.error('Cuentas inválidas');
    if (txType !== 'TRANSFER' && !category) return toast.error('Selecciona una categora');

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const val = Number(amount);
        
        let sDoc = null, dDoc = null;
        let sRef = null, dRef = null;

        // 1. ALL READS FIRST
        if (sourceAcc) {
          sRef = doc(db, 'fin_accounts', sourceAcc);
          sDoc = await transaction.get(sRef);
        }
        if (destAcc) {
          dRef = doc(db, 'fin_accounts', destAcc);
          dDoc = await transaction.get(dRef);
        }

        // 2. ALL WRITES
        const txRef = doc(collection(db, 'fin_transactions'));
        transaction.set(txRef, {
          amount: val,
          type: txType,
          category: txType === 'TRANSFER' ? 'TRANSFERENCIA' : category,
          description: desc || 'Registro manual',
          sourceAccountId: sourceAcc || null,
          destinationAccountId: destAcc || null,
          date: serverTimestamp(),
          createdBy: currentUser.uid,
        });

        if (sDoc && sDoc.exists()) {
          transaction.update(sRef, { balance: (sDoc.data().balance || 0) - val });
        }
        
        if (dDoc && dDoc.exists()) {
          transaction.update(dRef, { balance: (dDoc.data().balance || 0) + val });
        }
      });
      
      toast.success('Transacción registrada con éxito');
      setAmount(''); setDesc(''); setSourceAcc(''); setDestAcc(''); setCategory(''); setNlpText('');
    } catch(err) {
      console.error(err);
      toast.error('Error al registrar transacción');
    }
    setLoading(false);
  };

  const getSummaryText = () => {
    if (!amount || Number(amount) <= 0) return 'Completa los campos para ver el resumen...';
    const amtFmt = `L. ${Number(amount).toFixed(2)}`;
    const sName = accounts.find(a => a.id === sourceAcc)?.name || '[Cuenta Origen]';
    const dName = accounts.find(a => a.id === destAcc)?.name || '[Cuenta Destino]';
    
    let catLabel = '[Categoría]';
    if (txType === 'OUT') catLabel = categoriesOut.find(c => c.id === category)?.label || catLabel;
    if (txType === 'IN') catLabel = categoriesIn.find(c => c.id === category)?.label || catLabel;

    if (txType === 'OUT') return `Se restarán ${amtFmt} de ${sName} en concepto de ${catLabel}.`;
    if (txType === 'IN') return `Ingresarán ${amtFmt} a ${dName} en concepto de ${catLabel}.`;
    if (txType === 'TRANSFER') return `Se transferirán ${amtFmt} desde ${sName} hacia ${dName}.`;
    return '...';
  };

  const activeColor = txType === 'IN' ? '#4CAF50' : txType === 'OUT' ? '#f44336' : '#2196F3';
  const activeCategories = txType === 'IN' ? categoriesIn : txType === 'OUT' ? categoriesOut : [];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* SECCION 1: IA OMNIBOX */}
      <div style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #0f3460', marginBottom: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h3 style={{ color: '#00d2ff', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={24} /> Asistente Inteligente
        </h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '8px', border: '2px solid #0f3460', background: 'rgba(0,0,0,0.3)', color: 'white' }}
              placeholder="¿Qu movimiento financiero deseas registrar hoy? (Ej: Pagué 500 a Jenniffer desde la caja)"
              value={nlpText}
              onChange={e => setNlpText(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter') handleNlpAnalyze(); }}
            />
          </div>
          <button className="btn-primary" style={{ padding: '1rem 1.5rem', fontSize: '1.1rem', background: '#00d2ff', color: '#000', border: 'none' }} onClick={handleNlpAnalyze} disabled={nlpLoading}>
            {nlpLoading ? 'Analizando...' : '✨ Autocompletar'}
          </button>
        </div>
      </div>

      <form onSubmit={handleManualSubmit}>
        
        {/* SECCION 2: TIPO DE MOVIMIENTO (TARJETAS GRANDES) */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div 
            onClick={() => { setTxType('IN'); setCategory(''); }}
            style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                     border: txType === 'IN' ? '2px solid #4CAF50' : '1px solid var(--border-color)',
                     background: txType === 'IN' ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-color)' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🟢</div>
            <strong style={{ color: txType === 'IN' ? '#4CAF50' : 'var(--text-color)', fontSize: '1.2rem' }}>INGRESO</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>El dinero entra</div>
          </div>
          
          <div 
            onClick={() => { setTxType('OUT'); setCategory(''); }}
            style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                     border: txType === 'OUT' ? '2px solid #f44336' : '1px solid var(--border-color)',
                     background: txType === 'OUT' ? 'rgba(244, 67, 54, 0.1)' : 'var(--bg-color)' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔴</div>
            <strong style={{ color: txType === 'OUT' ? '#f44336' : 'var(--text-color)', fontSize: '1.2rem' }}>EGRESO</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>El dinero sale</div>
          </div>

          <div 
            onClick={() => { setTxType('TRANSFER'); setCategory('TRANSFERENCIA'); }}
            style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                     border: txType === 'TRANSFER' ? '2px solid #2196F3' : '1px solid var(--border-color)',
                     background: txType === 'TRANSFER' ? 'rgba(33, 150, 243, 0.1)' : 'var(--bg-color)' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔵</div>
            <strong style={{ color: txType === 'TRANSFER' ? '#2196F3' : 'var(--text-color)', fontSize: '1.2rem' }}>TRANSFERIR</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Entre mis cuentas</div>
          </div>
        </div>

        {/* SECCION 3: FORMULARIO DINAMICO */}
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: `1px solid ${activeColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label style={{ color: activeColor, fontWeight: 'bold' }}>¿Cuánto dinero? (L.)</label>
              <input type="number" step="0.01" className="input-field" style={{ fontSize: '1.5rem', padding: '1rem', fontWeight: 'bold' }} value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>

            <div className="form-group" style={{ flex: '2 1 300px' }}>
              <label style={{ color: activeColor, fontWeight: 'bold' }}>Descripción / Detalle corto</label>
              <input type="text" className="input-field" style={{ fontSize: '1.1rem', padding: '1rem' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Pago de internet, Venta extra..." required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            {(txType === 'OUT' || txType === 'TRANSFER') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>¿De dónde SALE el dinero?</label>
                <select className="input-field" style={{ padding: '0.8rem', fontSize: '1.1rem' }} value={sourceAcc} onChange={e => setSourceAcc(e.target.value)} required>
                  <option value="">Seleccionar Cuenta ▼</option>
                  {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.type==='CASH'?'🟢':'🏦'} {a.name} (L. {a.balance?.toFixed(2)})</option>)}
                </select>
              </div>
            )}

            {(txType === 'IN' || txType === 'TRANSFER') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>¿A dónde ENTRA el dinero?</label>
                <select className="input-field" style={{ padding: '0.8rem', fontSize: '1.1rem' }} value={destAcc} onChange={e => setDestAcc(e.target.value)} required>
                  <option value="">Seleccionar Cuenta ▼</option>
                  {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.type==='CASH'?'🟢':'🏦'} {a.name} (L. {a.balance?.toFixed(2)})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* SECCION CATEGORIAS EN GRID (Solo para IN / OUT) */}
          {txType !== 'TRANSFER' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>¿Bajo qué categora?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {activeCategories.map(cat => (
                  <div 
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '1rem 0.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      border: category === cat.id ? `2px solid ${activeColor}` : '1px solid var(--border-color)',
                      background: category === cat.id ? `${activeColor}15` : 'var(--bg-color)',
                      fontWeight: category === cat.id ? 'bold' : 'normal'
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{cat.icon}</div>
                    <div style={{ fontSize: '0.85rem' }}>{cat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCION 4: RESUMEN Y CONFIRMACION */}
          <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--border-color)', paddingTop: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '1.5rem', padding: '1rem', background: `${activeColor}10`, borderRadius: '8px', borderLeft: `4px solid ${activeColor}` }}>
              💡 <strong>Resumen:</strong> {getSummaryText()}
            </div>
            
            <button type="submit" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', background: activeColor, border: 'none' }} disabled={loading}>
              {loading ? 'Procesando...' : `💸 Confirmar ${txType === 'IN' ? 'Ingreso' : txType === 'OUT' ? 'Egreso' : 'Transferencia'}`}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

// ----------------------------------------------------
// TAB 3: ESTADO DE RESULTADOS (P&L)
// ----------------------------------------------------
function PLTab() {
  return (
    <div className="card">
      <h2>📈 Estado de Resultados (P&L)</h2>
      <p>Esta seccin calcular los ingresos y egresos operativos, excluyendo transferencias internas y gastos personales, para darte la Utilidad Neta real.</p>
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
        Mdulo P&L en construccin. Prximamente vers tarjetas clicables para explorar el P&L al instante.
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 4: ASISTENTE IA (CFO VIRTUAL)
// ----------------------------------------------------
function IATab() {
  return (
    <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      <h2>🤖 CFO Virtual (Chat de Finanzas)</h2>
      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', maxWidth: '80%', marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--primary-color)' }}>Asesor IA:</strong> Hola! Soy tu Director Financiero Virtual. En futuras actualizaciones, podrs preguntarme cosas como <em>"¿Cuál fue mi día más rentable esta semana?"</em> o <em>"¿En qué se me fue más dinero ayer?"</em> y leer el Libro Mayor para responderte.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input type="text" className="input-field" placeholder="Escribe tu pregunta..." disabled />
          <button className="btn-primary" disabled>Enviar</button>
        </div>
      </div>
    </div>
  );
}



// ----------------------------------------------------
// TAB: CUENTAS POR PAGAR (CXP)
// ----------------------------------------------------
function CxPTab({ accounts, currentUser }) {
  const [showNewCxP, setShowNewCxP] = useState(false);
  
  // New Debt Form State
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState('PRODUCTO'); // PRODUCTO, EFECTIVO
  const [debtAmount, setDebtAmount] = useState('');
  const [destBank, setDestBank] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState('UNICA'); // UNICA, SEMANAL, MENSUAL, CUOTAS
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [sourceBank, setSourceBank] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const pasivos = accounts.filter(a => a.type === 'PAYABLE' && a.balance > 0);

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    if (!debtName.trim() || !debtAmount || debtAmount <= 0) return toast.error('Datos inválidos');
    if (debtType === 'EFECTIVO' && !destBank) return toast.error('Debes seleccionar a qué cuenta entró el efectivo del prstamo');

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const val = Number(debtAmount);
        const debtId = 'cxp_' + Date.now(); // Unique ID for each debt
        const debtRef = doc(db, 'fin_accounts', debtId);
        
        // 1. Crear la cuenta por pagar (La Deuda)
        transaction.set(debtRef, {
          name: debtName.trim(),
          type: 'PAYABLE',
          debtType,
          originalAmount: val,
          balance: val,
          dueDate: dueDate || null,
          frequency,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });

        const txRef = doc(collection(db, 'fin_transactions'));

        // 2. Si es PRSTAMO EN EFECTIVO, el dinero entra a un banco
        if (debtType === 'EFECTIVO') {
          const bankRef = doc(db, 'fin_accounts', destBank);
          const bankDoc = await transaction.get(bankRef);
          if (bankDoc.exists()) {
            transaction.update(bankRef, { balance: (bankDoc.data().balance || 0) + val });
          }
          
          transaction.set(txRef, {
            amount: val,
            type: 'IN',
            category: 'ADQUISICION_DEUDA',
            description: 'Préstamo: ' + debtName.trim(),
            sourceAccountId: debtId,
            destinationAccountId: destBank,
            date: serverTimestamp(),
            createdBy: currentUser.uid,
          });
        } else {
          // Si es PRODUCTO, no entra dinero al banco, entra inventario (se considera gasto/inversin pagado por la CxP)
          transaction.set(txRef, {
            amount: val,
            type: 'OUT',
            category: 'INVERSION',
            description: 'Deuda por Producto: ' + debtName.trim(),
            sourceAccountId: debtId,
            destinationAccountId: null,
            date: serverTimestamp(),
            createdBy: currentUser.uid,
          });
        }
      });

      toast.success('Deuda registrada exitosamente');
      setShowNewCxP(false);
      setDebtName(''); setDebtAmount(''); setDueDate(''); setDestBank('');
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar la deuda');
    }
    setLoading(false);
  };

  const handlePayDebt = async (e) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) return toast.error('Monto inválido');
    if (!sourceBank) return toast.error('Selecciona de dónde sale el dinero');

    setPayLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const val = Number(payAmount);
        
        const debtRef = doc(db, 'fin_accounts', selectedDebt.id);
        const debtDoc = await transaction.get(debtRef);
        const bankRef = doc(db, 'fin_accounts', sourceBank);
        const bankDoc = await transaction.get(bankRef);

        if (!debtDoc.exists() || !bankDoc.exists()) throw new Error("Cuenta no existe");

        // Bajar saldo de la deuda y del banco
        transaction.update(debtRef, { balance: (debtDoc.data().balance || 0) - val });
        transaction.update(bankRef, { balance: (bankDoc.data().balance || 0) - val });

        // Registrar el pago en el ledger
        const txRef = doc(collection(db, 'fin_transactions'));
        transaction.set(txRef, {
          amount: val,
          type: 'OUT',
          category: 'PAGO_DEUDA',
          description: 'Abono/Pago a Deuda: ' + selectedDebt.name,
          sourceAccountId: sourceBank,
          destinationAccountId: selectedDebt.id,
          date: serverTimestamp(),
          createdBy: currentUser.uid,
        });
      });

      toast.success('Pago registrado exitosamente');
      setSelectedDebt(null);
      setPayAmount('');
      setSourceBank('');
    } catch(err) {
      console.error(err);
      toast.error('Error al procesar el pago');
    }
    setPayLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      
      {/* PANEL IZQUIERDO: DEUDAS ACTIVAS */}
      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItemás: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Cuentas por Pagar (Activas)</h2>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowNewCxP(!showNewCxP)}>
              {showNewCxP ? 'Cancelar' : '+ Registrar Nueva Deuda'}
            </button>
          </div>
          
          {showNewCxP && (
            <form onSubmit={handleCreateDebt} style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--primary-color)' }}>Nueva Deuda / CxP</h3>
              
              <div className="form-group">
                <label>¿A quin se le debe? / Nombre de la deuda</label>
                <input type="text" className="input-field" value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="Ej: Distribuidora Pollo Norteo, Préstamo de Juan" required />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Monto Total (L.)</label>
                  <input type="number" step="0.01" className="input-field" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tipo de Deuda</label>
                  <select className="input-field" value={debtType} onChange={e => setDebtType(e.target.value)}>
                    <option value="PRODUCTO">Producto / Inventario (Fiado)</option>
                    <option value="EFECTIVO">Préstamo en Efectivo</option>
                  </select>
                </div>
              </div>

              {debtType === 'EFECTIVO' && (
                <div className="form-group">
                  <label>¿A qué cuenta de tu negocio entró este dinero prestado?</label>
                  <select className="input-field" value={destBank} onChange={e => setDestBank(e.target.value)} required>
                    <option value="">Seleccione cuenta...</option>
                    {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha Límite de Pago</label>
                  <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Frecuencia de Pago</label>
                  <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
                    <option value="UNICA">Pago Único</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="MENSUAL">Mensual</option>
                    <option value="CUOTAS">Por Cuotas</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Registrando...' : 'Registrar Deuda en el Sistema'}
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pasivos.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Felicidades! No tienes deudas pendientes.</p> : null}
            {pasivos.map(a => (
               <div 
                 key={a.id} 
                 onClick={() => setSelectedDebt(a)}
                 style={{ 
                   display: 'flex', justifyContent: 'space-between', padding: '1rem', 
                   border: selectedDebt?.id === a.id ? '2px solid #f44336' : '1px solid var(--border-color)', 
                   borderRadius: '8px', cursor: 'pointer', background: selectedDebt?.id === a.id ? 'rgba(244, 67, 54, 0.05)' : 'var(--bg-color)'
                 }}
               >
                 <div>
                   <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>🔴 {a.name}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                     {a.debtType === 'PRODUCTO' ? '📦 Deuda de Producto' : '💵 Préstamo'} • Vence: {a.dueDate || 'N/A'}
                   </div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <strong style={{color: '#f44336', fontSize: '1.2rem', display: 'block'}}>L. {(a.balance || 0).toFixed(2)}</strong>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Falta por pagar</span>
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: DETALLES Y PAGOS */}
      <div style={{ flex: '1 1 400px' }}>
        <div className="card" style={{ height: '100%', minHeight: '400px' }}>
          {!selectedDebt ? (
            <div style={{ display: 'flex', height: '100%', alignItemás: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Haz clic en una deuda de la izquierda para gestionarla.
            </div>
          ) : (
            <div>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', color: '#f44336' }}>Realizar Abono / Pago</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Estás a punto de abonar a la deuda: <strong>{selectedDebt.name}</strong></p>
              </div>

              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #f44336' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Total Pendiente:</strong> L. {selectedDebt.balance?.toFixed(2)}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Vencimiento:</strong> {selectedDebt.dueDate}</p>
                <p style={{ margin: 0 }}><strong>Plan de Pago:</strong> {selectedDebt.frequency}</p>
              </div>

              <form onSubmit={handlePayDebt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Monto a Abonar (L.)</label>
                  <input type="number" step="0.01" className="input-field" value={payAmount} onChange={e => setPayAmount(e.target.value)} max={selectedDebt.balance} required />
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>No puedes pagar más de lo que debes.</small>
                </div>

                <div className="form-group">
                  <label>¿De dónde sale el dinero para pagar?</label>
                  <select className="input-field" value={sourceBank} onChange={e => setSourceBank(e.target.value)} required>
                    <option value="">Selecciona tu cuenta origen...</option>
                    {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name} (L. {a.balance?.toFixed(2)})</option>)}
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ backgroundColor: '#f44336', marginTop: '1rem' }} disabled={payLoading}>
                  {payLoading ? 'Procesando pago...' : '💸 Confirmar Pago / Abono'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
