const fs = require('fs');
let code = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

code = code.replace(
  `<div className="pos-container" style={{ padding: '1rem', overflowY: 'auto' }}>`,
  `<div className="finanzas-container" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>`
);

fs.writeFileSync('src/pages/Finanzas.jsx', code);
