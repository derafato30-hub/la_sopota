const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');
f = f.replace(/collection\(db, 'creditPayments'\)/g, "collection(db, 'receipts')");
fs.writeFileSync('src/pages/Finanzas.jsx', f);
console.log("Fixed abonos collection");
