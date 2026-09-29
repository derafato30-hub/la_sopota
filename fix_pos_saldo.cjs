const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

const replacement = `estado: estadoBase,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        saldoPendiente: hasCredit ? (effectiveSplitPayments.filter(p => p.method === 'CREDITO').reduce((acc, p) => acc + p.amount, 0)) : 0
      };`;

f = f.replace(/estado: estadoBase,\s*createdBy: currentUser\.uid,\s*createdAt: serverTimestamp\(\)\s*\};/g, replacement);
fs.writeFileSync('src/pages/POS.jsx', f);
