import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, setDoc, serverTimestamp, onSnapshot, where, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { TrendingUp, Wallet, ArrowRightLeft, FileText, CheckSquare, Plus, Activity, Cpu } from 'lucide-react';

const SEED_ACCOUNTS = [
  { id: 'efectivo_caja', name: 'Efectivo Caja', type: 'CASH', balance: 0 },
  { id: 'bac_elmer', name: 'BAC Elmer', type: 'BANK', balance: 0 },
  { id: 'bac_antony', name: 'BAC Antony', type: 'BANK', balance: 0 },
  { id: 'banco_atlantida', name: 'Banco Atlǭntida', type: 'BANK', balance: 0 },
  { id: 'cxp_pollo', name: 'CxP Pollo Norteo', type: 'PAYABLE', balance: 0 }
];

export default function Finanzas() {
  const { currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar Cuentas Financieras
    const q = query(collection(db, 'fin_accounts'));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        // Seed default accounts
        for (const acc of SEED_ACCOUNTS) {
          await setDoc(doc(db, 'fin_accounts', acc.id), acc);
        }
      } else {
        const accs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAccounts(accs);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (!hasPermission('SUPERUSUARIO') && !hasPermission('FINANZAS_MASTER')) {
    return <div style={{padding:'2rem'}}>Acceso Denegado. Se requiere nivel de Finanzas o Superusuario.</div>;
  }

  return (
    <div className="finanzas-container" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
        <TabButton active={activeTab === 'REGISTRAR'} onClick={() => setActiveTab('REGISTRAR')} icon={<Plus size={18}/>} label="Registrar Transaccin" />
        <TabButton active={activeTab === 'PL'} onClick={() => setActiveTab('PL')} icon={<TrendingUp size={18}/>} label="Estado de Resultados" />
        <TabButton active={activeTab === 'IA'} onClick={() => setActiveTab('IA')} icon={<Cpu size={18}/>} label="Asistente IA" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? <p>Cargando cuentas...</p> : (
          <>
            {activeTab === 'DASHBOARD' && <DashboardTab accounts={accounts} />}
            {activeTab === 'REGISTRAR' && <RegistrarTab accounts={accounts} currentUser={currentUser} />}
            {activeTab === 'CXP' && <CxPTab accounts={accounts} currentUser={currentUser} />}
            {activeTab === 'PL' && <PLTab />}
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
        cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
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
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Selecciona una cuenta para ver su Libro Mayor
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--accent-color)', paddingBottom: '1rem' }}>
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
                      <th>Categora</th>
                      <th>Descripcin</th>
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
// TAB 2: REGISTRAR (Manual / IA)
// ----------------------------------------------------
function RegistrarTab({ accounts, currentUser }) {
  const [txType, setTxType] = useState('IN'); // IN, OUT, TRANSFER, ADJUSTMENT
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [sourceAcc, setSourceAcc] = useState('');
  const [destAcc, setDestAcc] = useState('');
  const [loading, setLoading] = useState(false);

  // NLP Asistido
  const [nlpText, setNlpText] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Monto invlido');
    if (txType === 'IN' && !destAcc) return toast.error('Selecciona cuenta destino');
    if (txType === 'OUT' && !sourceAcc) return toast.error('Selecciona cuenta origen');
    if (txType === 'TRANSFER' && (!sourceAcc || !destAcc || sourceAcc === destAcc)) return toast.error('Cuentas invlidas');
    if (!category) return toast.error('Selecciona una categora');

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const val = Number(amount);
        
        // 1. Crear transaccin en el diario
        const txRef = doc(collection(db, 'fin_transactions'));
        transaction.set(txRef, {
          amount: val,
          type: txType,
          category,
          description: desc || 'Registro manual',
          sourceAccountId: sourceAcc || null,
          destinationAccountId: destAcc || null,
          date: serverTimestamp(),
          createdBy: currentUser.uid,
        });

        // 2. Afectar cuentas
        if (sourceAcc) {
          const sRef = doc(db, 'fin_accounts', sourceAcc);
          const sDoc = await transaction.get(sRef);
          if (sDoc.exists()) {
             // Si es una cuenta normal, el origen resta. Si es Cuenta por Pagar, tambin resta (porque estamos pagando la deuda)
             transaction.update(sRef, { balance: (sDoc.data().balance || 0) - val });
          }
        }
        
        if (destAcc) {
          const dRef = doc(db, 'fin_accounts', destAcc);
          const dDoc = await transaction.get(dRef);
          if (dDoc.exists()) {
             // El destino suma
             transaction.update(dRef, { balance: (dDoc.data().balance || 0) + val });
          }
        }
      });
      
      toast.success('Transaccin registrada con xito');
      setAmount(''); setDesc(''); setSourceAcc(''); setDestAcc(''); setCategory('');
    } catch(err) {
      console.error(err);
      toast.error('Error al registrar transaccin');
    }
    setLoading(false);
  };

  const handleNlpAnalyze = async () => {
    if (!nlpText) return;
    setNlpLoading(true);
    // Simularamos el llamado a la Cloud Function con Gemini
    // Por ahora, como no hay backend node para llamar a Gemini de manera segura (con API keys), 
    // mostraremos un mockup funcional educacional de cmo funcionar.
    setTimeout(() => {
      toast.success('IA: Anlisis completado');
      setTxType('OUT');
      setAmount(3000);
      setCategory('PLANILLA');
      setDesc(nlpText);
      setSourceAcc(accounts.find(a => a.type==='CASH')?.id || '');
      setNlpLoading(false);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div className="card" style={{ flex: '1 1 400px' }}>
        <h2>📝 Registro Manual</h2>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label>Tipo de Movimiento</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label><input type="radio" name="txType" checked={txType === 'IN'} onChange={() => setTxType('IN')} /> Ingreso</label>
              <label><input type="radio" name="txType" checked={txType === 'OUT'} onChange={() => setTxType('OUT')} /> Egreso</label>
              <label><input type="radio" name="txType" checked={txType === 'TRANSFER'} onChange={() => setTxType('TRANSFER')} /> Transferencia Interna</label>
            </div>
          </div>

          <div className="form-group">
            <label>Monto (L.)</label>
            <input type="number" step="0.01" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Categora</label>
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">Selecciona...</option>
              {txType === 'IN' && (
                <>
                  <option value="VENTA_POS">Ingreso por Venta (POS)</option>
                  <option value="CLUB">Ingreso Club Cadetes</option>
                  <option value="COBRO_CREDITO">Cobro de Crdito</option>
                  <option value="AJUSTE_POSITIVO">Ajuste Extraordinario (Sobrante)</option>
                </>
              )}
              {txType === 'OUT' && (
                <>
                  <option value="INVERSION">Inversin/Reinversin (Pollo, Alitas)</option>
                  <option value="CAJA_CHICA">Gasto Caja Chica</option>
                  <option value="PLANILLA">Planilla / Sueldos</option>
                  <option value="CUENTAS_PAGADAS">Pago de CxP Pendientes</option>
                  <option value="GASTO_PERSONAL">Retiro Socios / Gasto Personal (Casa)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Extraordinario (Faltante)</option>
                </>
              )}
              {txType === 'TRANSFER' && <option value="TRANSFERENCIA">Movimiento Interno</option>}
            </select>
          </div>

          {(txType === 'OUT' || txType === 'TRANSFER') && (
            <div className="form-group">
              <label>Cuenta de Origen (De dnde sale)</label>
              <select className="input-field" value={sourceAcc} onChange={e => setSourceAcc(e.target.value)} required>
                <option value="">Selecciona cuenta origen...</option>
                {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {(txType === 'IN' || txType === 'TRANSFER') && (
            <div className="form-group">
              <label>Cuenta Destino (A dnde entra)</label>
              <select className="input-field" value={destAcc} onChange={e => setDestAcc(e.target.value)} required>
                <option value="">Selecciona cuenta destino...</option>
                {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Descripcin / Referencia</label>
            <input type="text" className="input-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Pago a Jenniffer" required />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Confirmar Transaccin'}
          </button>
        </form>
      </div>

      <div className="card" style={{ flex: '1 1 400px', backgroundColor: 'rgba(33, 150, 243, 0.05)', border: '1px solid #2196F3' }}>
        <h2 style={{ color: '#2196F3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Cpu size={24}/> Asistente de Registro IA</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Escribe en lenguaje natural lo que pas y la IA llenar el formulario automticamente.</p>
        
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <textarea 
            className="input-field" 
            rows="4" 
            placeholder='Ej: "Pagu 3000 de planilla a Jenniffer en efectivo" o "Transfer 200 lempiras de BAC Elmer a BAC Antony"'
            value={nlpText}
            onChange={e => setNlpText(e.target.value)}
          />
        </div>
        
        <button className="btn-secondary" style={{ width: '100%', borderColor: '#2196F3', color: '#2196F3' }} onClick={handleNlpAnalyze} disabled={nlpLoading}>
          {nlpLoading ? 'Procesando lenguaje natural...' : 'Analizar con IA ✨'}
        </button>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid #2196F3' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Borrador Propuesto (An no guardado):</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Una vez que la IA termine, revisa los campos en el formulario de la izquierda y haz clic en "Confirmar Transaccin" para hacerlo oficial.
          </p>
        </div>
      </div>
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
            <strong style={{ color: 'var(--primary-color)' }}>Asesor IA:</strong> ¡Hola! Soy tu Director Financiero Virtual. En futuras actualizaciones, podrs preguntarme cosas como <em>"¿Cul fue mi da ms rentable esta semana?"</em> o <em>"¿En qu se me fue ms dinero ayer?"</em> y leer el Libro Mayor para responderte.
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
  const [newCxPName, setNewCxPName] = useState('');
  const [newCxPFreq, setNewCxPFreq] = useState('MENSUAL'); // UNICA, SEMANAL, MENSUAL
  const [loading, setLoading] = useState(false);

  // Formularios de pago/deuda
  const [activeForm, setActiveForm] = useState(null); // 'DEBT' o 'PAY'
  const [selectedCxP, setSelectedCxP] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const pasivos = accounts.filter(a => a.type === 'PAYABLE');

  const handleCreateCxP = async (e) => {
    e.preventDefault();
    if (!newCxPName.trim()) return;
    setLoading(true);
    try {
      const id = 'cxp_' + newCxPName.trim().toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, 'fin_accounts', id), {
        name: 'CxP ' + newCxPName.trim(),
        type: 'PAYABLE',
        frequency: newCxPFreq,
        balance: 0
      });
      toast.success('Cuenta por Pagar creada exitosamente');
      setShowNewCxP(false);
      setNewCxPName('');
    } catch (e) {
      console.error(e);
      toast.error('Error al crear la cuenta');
    }
    setLoading(false);
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Monto invlido');
    if (!selectedCxP) return toast.error('Selecciona una cuenta por pagar');
    if (!selectedBank) return toast.error('Selecciona una cuenta origen/destino');

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const val = Number(amount);
        const txRef = doc(collection(db, 'fin_transactions'));
        
        let source, dest, category, txType;

        if (activeForm === 'DEBT') {
          // Adquirir Deuda: Aumenta CxP y Aumenta Efectivo (Prstamo) o Inventario (Crdito de Pollo)
          // Contablemente: El origen es CxP, el destino es Efectivo
          txType = 'IN';
          category = 'ADQUISICION_DEUDA';
          source = selectedCxP; // El pasivo nos da el dinero
          dest = selectedBank; // Entra a nuestro banco
        } else {
          // Pagar Deuda: Disminuye Banco y Disminuye CxP
          // Contablemente: El origen es Banco, el destino es CxP
          txType = 'OUT';
          category = 'PAGO_DEUDA';
          source = selectedBank;
          dest = selectedCxP;
        }

        transaction.set(txRef, {
          amount: val,
          type: txType,
          category,
          description: desc || (activeForm === 'DEBT' ? 'Adquisicin de deuda' : 'Pago de deuda'),
          sourceAccountId: source,
          destinationAccountId: dest,
          date: serverTimestamp(),
          createdBy: currentUser.uid,
        });

        // Modificar cuentas
        const cxpRef = doc(db, 'fin_accounts', selectedCxP);
        const cxpDoc = await transaction.get(cxpRef);
        const bankRef = doc(db, 'fin_accounts', selectedBank);
        const bankDoc = await transaction.get(bankRef);

        if (activeForm === 'DEBT') {
          // Sube la deuda y sube el banco
          transaction.update(cxpRef, { balance: (cxpDoc.data().balance || 0) + val });
          transaction.update(bankRef, { balance: (bankDoc.data().balance || 0) + val });
        } else {
          // Baja la deuda y baja el banco
          transaction.update(cxpRef, { balance: (cxpDoc.data().balance || 0) - val });
          transaction.update(bankRef, { balance: (bankDoc.data().balance || 0) - val });
        }
      });
      
      toast.success(activeForm === 'DEBT' ? 'Deuda registrada y dinero ingresado' : 'Pago registrado y deuda reducida');
      setActiveForm(null); setAmount(''); setDesc(''); setSelectedCxP(''); setSelectedBank('');
    } catch(err) {
      console.error(err);
      toast.error('Error al procesar');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Cuentas por Pagar Activas</h3>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowNewCxP(!showNewCxP)}>+ Nueva</button>
          </div>
          
          {showNewCxP && (
            <form onSubmit={handleCreateCxP} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group">
                <label>Nombre de la Entidad (A quin se le debe)</label>
                <input type="text" className="input-field" value={newCxPName} onChange={e => setNewCxPName(e.target.value)} placeholder="Ej: Negocio Externo, Pollo Norteo" required />
              </div>
              <div className="form-group">
                <label>Frecuencia de Pago</label>
                <select className="input-field" value={newCxPFreq} onChange={e => setNewCxPFreq(e.target.value)}>
                  <option value="UNICA">Una Sola Vez (Unica)</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>Crear Cuenta</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {pasivos.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No hay cuentas por pagar.</p> : null}
            {pasivos.map(a => (
               <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                 <div>
                   <div style={{ fontWeight: 'bold' }}>🔴 {a.name}</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frecuencia: {a.frequency || 'N/A'}</div>
                 </div>
                 <strong style={{color: '#f44336'}}>L. {(a.balance || 0).toFixed(2)}</strong>
               </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: '1 1 400px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Operaciones de CxP</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className={`btn-${activeForm === 'DEBT' ? 'primary' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setActiveForm('DEBT')}>
              📥 Registrar Deuda Entrante
            </button>
            <button className={`btn-${activeForm === 'PAY' ? 'primary' : 'secondary'}`} style={{ flex: 1, backgroundColor: activeForm === 'PAY' ? '#f44336' : '' }} onClick={() => setActiveForm('PAY')}>
              💸 Pagar Deuda
            </button>
          </div>

          {activeForm && (
            <form onSubmit={handleTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Selecciona la Cuenta por Pagar</label>
                <select className="input-field" value={selectedCxP} onChange={e => setSelectedCxP(e.target.value)} required>
                  <option value="">Seleccione...</option>
                  {pasivos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>{activeForm === 'DEBT' ? '¿A qu cuenta ingres el dinero/valor?' : '¿De dnde sali el dinero para pagar?'}</label>
                <select className="input-field" value={selectedBank} onChange={e => setSelectedBank(e.target.value)} required>
                  <option value="">Seleccione...</option>
                  {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Monto (L.)</label>
                <input type="number" step="0.01" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Descripcin / Referencia</label>
                <input type="text" className="input-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Pago quincenal de pollo" required />
              </div>

              <button type="submit" className="btn-primary" style={{ backgroundColor: activeForm === 'PAY' ? '#f44336' : '' }} disabled={loading}>
                {loading ? 'Procesando...' : (activeForm === 'DEBT' ? 'Registrar Adquisicin de Deuda' : 'Ejecutar Pago de Deuda')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
