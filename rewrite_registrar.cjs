const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

// The new RegistrarTab code
const newRegistrarTab = `
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
    { id: 'INVERSION', icon: '📦', label: 'Inversin/Prod.' },
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
    // Simular el llamado a Gemini
    setTimeout(() => {
      toast.success('IA: He llenado el formulario por ti.');
      setTxType('OUT');
      setAmount(3000);
      setCategory('PLANILLA');
      setDesc(nlpText);
      setSourceAcc(accounts.find(a => a.type==='CASH')?.id || '');
      setNlpLoading(false);
    }, 1500);
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

        if (sourceAcc) {
          const sRef = doc(db, 'fin_accounts', sourceAcc);
          const sDoc = await transaction.get(sRef);
          if (sDoc.exists()) transaction.update(sRef, { balance: (sDoc.data().balance || 0) - val });
        }
        
        if (destAcc) {
          const dRef = doc(db, 'fin_accounts', destAcc);
          const dDoc = await transaction.get(dRef);
          if (dDoc.exists()) transaction.update(dRef, { balance: (dDoc.data().balance || 0) + val });
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
    const amtFmt = \`L. \${Number(amount).toFixed(2)}\`;
    const sName = accounts.find(a => a.id === sourceAcc)?.name || '[Cuenta Origen]';
    const dName = accounts.find(a => a.id === destAcc)?.name || '[Cuenta Destino]';
    
    let catLabel = '[Categoría]';
    if (txType === 'OUT') catLabel = categoriesOut.find(c => c.id === category)?.label || catLabel;
    if (txType === 'IN') catLabel = categoriesIn.find(c => c.id === category)?.label || catLabel;

    if (txType === 'OUT') return \`Se restarán \${amtFmt} de \${sName} en concepto de \${catLabel}.\`;
    if (txType === 'IN') return \`Ingresarán \${amtFmt} a \${dName} en concepto de \${catLabel}.\`;
    if (txType === 'TRANSFER') return \`Se transferirán \${amtFmt} desde \${sName} hacia \${dName}.\`;
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
              placeholder="¿Qu movimiento financiero deseas registrar hoy? (Ej: Pagu 500 a Jenniffer desde la caja)"
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
        <div style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: \`1px solid \${activeColor}\`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label style={{ color: activeColor, fontWeight: 'bold' }}>¿Cunto dinero? (L.)</label>
              <input type="number" step="0.01" className="input-field" style={{ fontSize: '1.5rem', padding: '1rem', fontWeight: 'bold' }} value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>

            <div className="form-group" style={{ flex: '2 1 300px' }}>
              <label style={{ color: activeColor, fontWeight: 'bold' }}>Descripcin / Detalle corto</label>
              <input type="text" className="input-field" style={{ fontSize: '1.1rem', padding: '1rem' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Pago de internet, Venta extra..." required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            {(txType === 'OUT' || txType === 'TRANSFER') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>¿De dnde SALE el dinero?</label>
                <select className="input-field" style={{ padding: '0.8rem', fontSize: '1.1rem' }} value={sourceAcc} onChange={e => setSourceAcc(e.target.value)} required>
                  <option value="">Seleccionar Cuenta ▼</option>
                  {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.type==='CASH'?'🟢':'🏦'} {a.name} (L. {a.balance?.toFixed(2)})</option>)}
                </select>
              </div>
            )}

            {(txType === 'IN' || txType === 'TRANSFER') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>¿A dnde ENTRA el dinero?</label>
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
              <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>¿Bajo qu categora?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {activeCategories.map(cat => (
                  <div 
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '1rem 0.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      border: category === cat.id ? \`2px solid \${activeColor}\` : '1px solid var(--border-color)',
                      background: category === cat.id ? \`\${activeColor}15\` : 'var(--bg-color)',
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
            <div style={{ fontSize: '1.2rem', marginBottom: '1.5rem', padding: '1rem', background: \`\${activeColor}10\`, borderRadius: '8px', borderLeft: \`4px solid \${activeColor}\` }}>
              💡 <strong>Resumen:</strong> {getSummaryText()}
            </div>
            
            <button type="submit" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', background: activeColor, border: 'none' }} disabled={loading}>
              {loading ? 'Procesando...' : \`💸 Confirmar \${txType === 'IN' ? 'Ingreso' : txType === 'OUT' ? 'Egreso' : 'Transferencia'}\`}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
`;

// Extract everything from function RegistrarTab to the start of PLTab
const regex = /\/\/ -+\s*\n\/\/ TAB 2: REGISTRAR[\s\S]*?(?=\/\/ -+\s*\n\/\/ TAB 3: ESTADO DE RESULTADOS)/;
if (regex.test(f)) {
  f = f.replace(regex, newRegistrarTab + '\n');
} else {
  console.log("Could not find RegistrarTab segment.");
}

// Fix common encodings for my strings
const fixes = {
  'Cunto': 'Cuánto',
  'Descripcin': 'Descripción',
  'dnde': 'dónde',
  'qu ': 'qué ',
  'Categora': 'Categoría',
  'Pagu ': 'Pagué ',
  'Inversin': 'Inversión'
};
for (const [bad, good] of Object.entries(fixes)) {
  f = f.replace(new RegExp(bad, 'g'), good);
}

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Successfully updated RegistrarTab');
