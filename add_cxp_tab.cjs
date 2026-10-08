const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

// 1. Update the required accounts and seeding logic
const newSeedLogic = `
  useEffect(() => {
    // Escuchar Cuentas Financieras
    const q = query(collection(db, 'fin_accounts'));
    const unsub = onSnapshot(q, async (snap) => {
      const requiredAccounts = [
        { id: 'efectivo_caja', name: 'Efectivo', type: 'CASH', balance: 0 },
        { id: 'bac_antony', name: 'BAC Antony', type: 'BANK', balance: 0 },
        { id: 'bac_delmy', name: 'BAC Delmy', type: 'BANK', balance: 0 },
        { id: 'bac_elmer', name: 'BAC Elmer', type: 'BANK', balance: 0 },
        { id: 'banpais', name: 'Banpais', type: 'BANK', balance: 0 },
        { id: 'ficohsa', name: 'Ficohsa', type: 'BANK', balance: 0 },
        { id: 'atlantida', name: 'Atlantida', type: 'BANK', balance: 0 },
        { id: 'occidente', name: 'Occidente', type: 'BANK', balance: 0 },
        { id: 'davivienda', name: 'Davivienda', type: 'BANK', balance: 0 },
      ];

      const accs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Auto-create missing default bank accounts
      const existingIds = new Set(accs.map(a => a.id));
      for (const acc of requiredAccounts) {
        if (!existingIds.has(acc.id)) {
          await setDoc(doc(db, 'fin_accounts', acc.id), acc, { merge: true });
        }
      }

      setAccounts(accs);
      setLoading(false);
    });
    return () => unsub();
  }, []);
`;

// Replace the old useEffect
f = f.replace(/useEffect\(\(\) => \{\s*\/\* Escuchar Cuentas Financieras \*\/[\s\S]*?\}, \[\]\);/, newSeedLogic);

// 2. Add CXP Tab Button
f = f.replace(/<TabButton active=\{activeTab === 'REGISTRAR'\}/, `<TabButton active={activeTab === 'CXP'} onClick={() => setActiveTab('CXP')} icon={<FileText size={18}/>} label="Cuentas por Pagar" />\n        <TabButton active={activeTab === 'REGISTRAR'}`);

// 3. Add CXP Tab Render
f = f.replace(/\{activeTab === 'REGISTRAR' && <RegistrarTab accounts=\{accounts\} currentUser=\{currentUser\} \/>\}/, `{activeTab === 'REGISTRAR' && <RegistrarTab accounts={accounts} currentUser={currentUser} />}\n            {activeTab === 'CXP' && <CxPTab accounts={accounts} currentUser={currentUser} />}`);

// 4. Create CxPTab component at the end
const cxpTabComponent = `
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
      const id = 'cxp_' + newCxPName.trim().toLowerCase().replace(/\\s+/g, '_');
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
            <button className={\`btn-\${activeForm === 'DEBT' ? 'primary' : 'secondary'}\`} style={{ flex: 1 }} onClick={() => setActiveForm('DEBT')}>
              📥 Registrar Deuda Entrante
            </button>
            <button className={\`btn-\${activeForm === 'PAY' ? 'primary' : 'secondary'}\`} style={{ flex: 1, backgroundColor: activeForm === 'PAY' ? '#f44336' : '' }} onClick={() => setActiveForm('PAY')}>
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
`;

f += '\n' + cxpTabComponent;

fs.writeFileSync('src/pages/Finanzas.jsx', f);
console.log('Fixed CxP Tab');
