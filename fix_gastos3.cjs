const fs = require('fs');
let code = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

const regex = /await addDoc\(collection\(db, 'expenses'\), \{\s*amount: Number\(gastoData\.amount\),\s*reason: gastoData\.reason,\s*createdBy: currentUser\.uid,\s*createdAt: serverTimestamp\(\)\s*\}\);/;

code = code.replace(regex, `await addDoc(collection(db, 'expenses'), {
        amount: Number(gastoData.amount),
        reason: gastoData.reason,
        category: 'CAJA_CHICA',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });`);

fs.writeFileSync('src/pages/Gastos.jsx', code);
