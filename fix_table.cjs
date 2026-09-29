const fs = require('fs');
let code = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

code = code.replace('<table className="pos-table">', '<table className="data-table">');

fs.writeFileSync('src/pages/Finanzas.jsx', code);
