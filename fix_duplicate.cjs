const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

f = f.replace(/setUnpaidWarningOrder\(freshOrder\);\r?\n\s*setUnpaidWarningOrder\(dispatchOrder\);/, 'setUnpaidWarningOrder(freshOrder);');

fs.writeFileSync('src/pages/POS.jsx', f);
