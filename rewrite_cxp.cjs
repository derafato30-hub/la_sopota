const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

const newCxPTab = `
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
    if (!debtName.trim() || !debtAmount || debtAmount <= 0) return toast.error('Datos invlidos');
    if (debtType === 'EFECTIVO' && !destBank) return toast.error('Debes seleccionar a qu cuenta entr el efectivo del prstamo');

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
            description: 'Prstamo: ' + debtName.trim(),
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
    if (!payAmount || payAmount <= 0) return toast.error('Monto invlido');
    if (!sourceBank) return toast.error('Selecciona de dnde sale el dinero');

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                <input type="text" className="input-field" value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="Ej: Distribuidora Pollo Norteo, Prstamo de Juan" required />
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
                    <option value="EFECTIVO">Prstamo en Efectivo</option>
                  </select>
                </div>
              </div>

              {debtType === 'EFECTIVO' && (
                <div className="form-group">
                  <label>¿A qu cuenta de tu negocio entr este dinero prestado?</label>
                  <select className="input-field" value={destBank} onChange={e => setDestBank(e.target.value)} required>
                    <option value="">Seleccione cuenta...</option>
                    {accounts.filter(a => a.type !== 'PAYABLE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha Lmite de Pago</label>
                  <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Frecuencia de Pago</label>
                  <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
                    <option value="UNICA">Pago nico</option>
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
                     {a.debtType === 'PRODUCTO' ? '📦 Deuda de Producto' : '💵 Prstamo'} • Vence: {a.dueDate || 'N/A'}
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
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Haz clic en una deuda de la izquierda para gestionarla.
            </div>
          ) : (
            <div>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', color: '#f44336' }}>Realizar Abono / Pago</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Ests a punto de abonar a la deuda: <strong>{selectedDebt.name}</strong></p>
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
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>No puedes pagar ms de lo que debes.</small>
                </div>

                <div className="form-group">
                  <label>¿De dnde sale el dinero para pagar?</label>
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
`;

// Extract everything from function CxPTab to the end of the file
const parts = f.split(/\/\/\s*-+\s*\/\/\s*TAB:\s*CUENTAS\s*POR\s*PAGAR\s*\(CXP\)\s*\/\/\s*-+/);
if (parts.length > 1) {
  f = parts[0] + newCxPTab;
} else {
  console.log("Could not find the split point, maybe the regex is wrong.");
  // Alternative fallback
  const altParts = f.split('function CxPTab');
  if (altParts.length > 1) {
    f = altParts[0] + newCxPTab.replace('function CxPTab', 'function CxPTab');
  }
}

// Ensure correct encoding
const fixes = {
  'invlido': 'inválido',
  'dnde': 'dónde',
  'qu ': 'qué ',
  'Prstamo': 'Préstamo',
  'entr ': 'entró ',
  'nico': 'Único',
  'Lmite': 'Límite',
  'Ests': 'Estás',
  'ms': 'más'
};

for (const [bad, good] of Object.entries(fixes)) {
  f = f.replace(new RegExp(bad, 'g'), good);
}

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Successfully updated CxPTab');
