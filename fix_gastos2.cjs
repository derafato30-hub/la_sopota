const fs = require('fs');
let code = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

code = code.replace(
  `await addDoc(collection(db, 'expenses'), {
        amount: Number(gastoData.amount),
        reason: gastoData.reason,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });`,
  `await addDoc(collection(db, 'expenses'), {
        amount: Number(gastoData.amount),
        reason: gastoData.reason,
        category: 'CAJA_CHICA',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });`
);

fs.writeFileSync('src/pages/Gastos.jsx', code);
