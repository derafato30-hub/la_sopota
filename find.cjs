const fs = require('fs');
const lines = fs.readFileSync('src/pages/POS.jsx', 'utf-8').split('\n');
lines.forEach((l, i) => { if (l.includes('includeDeliveryInInvoice')) console.log(i+1, l); });
