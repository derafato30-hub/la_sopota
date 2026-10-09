const fs = require('fs');
const path = 'src/pages/Gastos.jsx';
let f = fs.readFileSync(path, 'utf8');

// 1. Add runTransaction and doc imports
if (!f.includes('runTransaction')) {
  f = f.replace(/import \{ collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, where, Timestamp \} from 'firebase\/firestore';/,
    "import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, where, Timestamp, runTransaction, doc } from 'firebase/firestore';");
}

// 2. Add finAccounts state and fetch it
if (!f.includes('const [finAccounts, setFinAccounts]')) {
  f = f.replace(/const \[gastos, setGastos\] = useState\(\[\]\);/,
    "const [gastos, setGastos] = useState([]);\n  const [finAccounts, setFinAccounts] = useState([]);");
  
  f = f.replace(/const qGastos = query\(collection\(db, 'expenses'\)/,
    "const snapAcc = await getDocs(collection(db, 'fin_accounts'));\n      setFinAccounts(snapAcc.docs.map(d => ({ id: d.id, ...d.data() })));\n\n      const qGastos = query(collection(db, 'expenses')");
}

// 3. Update calcularTotalesDelDia logic
const oldStatsGastos = `      if (e.isThirdParty) {
        if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
          stats.pagosRepartidores += e.amount;
        } else {
          stats.gastosTerceros += e.amount;
        }
      } else {
        stats.gastosOperativos += e.amount;
      }`;

const newStatsGastos = `      // Solo sumar a las salidas de efectivo si se pagó con EFECTIVO CAJA
      if (!e.sourceAccountId || e.sourceAccountId === 'efectivo_caja') {
        if (e.isThirdParty) {
          if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
            stats.pagosRepartidores += e.amount;
          } else {
            stats.gastosTerceros += e.amount;
          }
        } else {
          stats.gastosOperativos += e.amount;
        }
      }`;

f = f.replace(oldStatsGastos, newStatsGastos);

// 4. Update gastoData state to include sourceAcc
f = f.replace(/const \[gastoData, setGastoData\] = useState\(\{ amount: 0, reason: '' \}\);/,
  "const [gastoData, setGastoData] = useState({ amount: 0, reason: '', sourceAcc: 'efectivo_caja' });");
f = f.replace(/setGastoData\(\{ amount: 0, reason: '' \}\);/g,
  "setGastoData({ amount: 0, reason: '', sourceAcc: 'efectivo_caja' });");

// 5. Update handleSaveGasto
const oldHandleSaveGasto = `  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (gastoData.amount <= 0) return toast.error("El monto debe ser válido.");
    
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: Number(gastoData.amount),
        reason: gastoData.reason,
        category: 'CAJA_CHICA',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      await logAuditAction('NUEVO_GASTO', 'CAJA', \`L. \${gastoData.amount} por \${gastoData.reason}\`, currentUser);
      
      setShowGastoModal(false);
      setGastoData({ amount: 0, reason: '' });
      fetchGastosYCierres();
    } catch (error) {
      console.error("Error guardando el gasto:", error);
    }
  };`;

const newHandleSaveGasto = `  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (gastoData.amount <= 0) return toast.error("El monto debe ser válido.");
    
    try {
      const val = Number(gastoData.amount);
      const sAcc = gastoData.sourceAcc || 'efectivo_caja';

      // 1. Guardar en 'expenses' para el módulo de Cierre (con el sourceAccountId)
      const expRef = await addDoc(collection(db, 'expenses'), {
        amount: val,
        reason: gastoData.reason,
        category: 'CAJA_CHICA',
        sourceAccountId: sAcc,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // 2. Transacción Financiera en 'fin_transactions' (Ledger)
      await runTransaction(db, async (t) => {
         const accRef = doc(db, 'fin_accounts', sAcc);
         const accDoc = await t.get(accRef);
         
         const txRef = doc(collection(db, 'fin_transactions'));
         t.set(txRef, {
           amount: val,
           type: 'OUT',
           category: 'GASTO_OPERATIVO', // Categoría general para estos
           description: \`Gasto POS/Caja: \${gastoData.reason}\`,
           sourceAccountId: sAcc,
           destinationAccountId: null,
           date: serverTimestamp(),
           createdBy: currentUser.uid,
           metadata: { expenseId: expRef.id }
         });

         if (accDoc.exists()) {
           t.update(accRef, { balance: (accDoc.data().balance || 0) - val });
         }
      });

      await logAuditAction('NUEVO_GASTO', 'CAJA', \`L. \${val} por \${gastoData.reason} (Cuenta: \${sAcc})\`, currentUser);
      
      setShowGastoModal(false);
      setGastoData({ amount: 0, reason: '', sourceAcc: 'efectivo_caja' });
      fetchGastosYCierres();
    } catch (error) {
      console.error("Error guardando el gasto:", error);
      toast.error("Error guardando el gasto.");
    }
  };`;

f = f.replace(oldHandleSaveGasto, newHandleSaveGasto);

// 6. Update UI in modal to include the select
const oldModalGastoForm = `            <form onSubmit={handleSaveGasto}>
              <div className="form-group">
                <label>Monto (L.)</label>
                <input type="number" className="input-field" required min="1" step="1"
                  value={gastoData.amount || ''} onChange={e => setGastoData({...gastoData, amount: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Concepto / Motivo</label>
                <input type="text" className="input-field" required placeholder="Ej: Compra de hielo, pago a proveedor..."
                  value={gastoData.reason} onChange={e => setGastoData({...gastoData, reason: e.target.value})} 
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowGastoModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary highlight-btn" style={{flex: 2}}>Guardar Gasto</button>
              </div>
            </form>`;

const newModalGastoForm = `            <form onSubmit={handleSaveGasto}>
              <div className="form-group">
                <label>Cuenta de Pago</label>
                <select className="input-field" value={gastoData.sourceAcc} onChange={e => setGastoData({...gastoData, sourceAcc: e.target.value})}>
                  {finAccounts.filter(a => a.type !== 'PAYABLE').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Monto (L.)</label>
                <input type="number" className="input-field" required min="1" step="1"
                  value={gastoData.amount || ''} onChange={e => setGastoData({...gastoData, amount: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Concepto / Motivo</label>
                <input type="text" className="input-field" required placeholder="Ej: Compra de hielo, pago a proveedor..."
                  value={gastoData.reason} onChange={e => setGastoData({...gastoData, reason: e.target.value})} 
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowGastoModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary highlight-btn" style={{flex: 2}}>Guardar Gasto</button>
              </div>
            </form>`;

f = f.replace(oldModalGastoForm, newModalGastoForm);

fs.writeFileSync(path, f, 'utf8');
console.log("Gastos.jsx modified successfully.");
