const fs = require('fs');
const path = 'src/pages/Gastos.jsx';
let f = fs.readFileSync(path, 'utf8');

// Use replace_file_content-like logic, but strictly via regex that ignores whitespace differences.
// 1. Patch the snapExp loop
const matchExpLoop = /if \(e\.isThirdParty\) \{\s*if \(e\.reason && e\.reason\.toLowerCase\(\)\.includes\('repartidor'\)\) \{\s*stats\.pagosRepartidores \+= e\.amount;\s*\} else \{\s*stats\.gastosTerceros \+= e\.amount;\s*\}\s*\} else \{\s*stats\.gastosOperativos \+= e\.amount;\s*\}/g;
f = f.replace(matchExpLoop, `if (!e.sourceAccountId || e.sourceAccountId === 'efectivo_caja') {
        if (e.isThirdParty) {
          if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
            stats.pagosRepartidores += e.amount;
          } else {
            stats.gastosTerceros += e.amount;
          }
        } else {
          stats.gastosOperativos += e.amount;
        }
      }`);

// 2. Patch the handleSaveGasto
const matchSaveGasto = /await addDoc\(collection\(db, 'expenses'\), \{\s*amount: Number\(gastoData\.amount\),\s*reason: gastoData\.reason,\s*category: 'CAJA_CHICA',\s*createdBy: currentUser\.uid,\s*createdAt: serverTimestamp\(\)\s*\}\);/g;

f = f.replace(matchSaveGasto, `const val = Number(gastoData.amount);
      const sAcc = gastoData.sourceAcc || 'efectivo_caja';

      const expRef = await addDoc(collection(db, 'expenses'), {
        amount: val,
        reason: gastoData.reason,
        category: 'CAJA_CHICA',
        sourceAccountId: sAcc,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      await runTransaction(db, async (t) => {
         const accRef = doc(db, 'fin_accounts', sAcc);
         const accDoc = await t.get(accRef);
         
         const txRef = doc(collection(db, 'fin_transactions'));
         t.set(txRef, {
           amount: val,
           type: 'OUT',
           category: 'GASTO_OPERATIVO',
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
      });`);

// 3. Patch the UI form
const matchForm = /<div className="form-group">\s*<label>Monto \(L\.\)<\/label>/;
f = f.replace(matchForm, `<div className="form-group">
                <label>Cuenta de Pago</label>
                <select className="input-field" value={gastoData.sourceAcc} onChange={e => setGastoData({...gastoData, sourceAcc: e.target.value})}>
                  {finAccounts.filter(a => a.type !== 'PAYABLE').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Monto (L.)</label>`);


fs.writeFileSync(path, f, 'utf8');
console.log("Gastos.jsx fully patched.");
