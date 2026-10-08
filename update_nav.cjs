const fs = require('fs');
let f = fs.readFileSync('src/components/Layout.jsx', 'utf8');
f = f.replace(/<span style=\{\{fontSize: '0\.7rem', color: '#ffb74d'\}\}>En construccin<\/span>/, 
              `<span style={{fontSize: '0.7rem', color: '#4caf50'}}>Nuevo Ledger</span>`);
// In case encoding fails:
f = f.replace(/<span style=\{\{fontSize: '0\.7rem', color: '#ffb74d'\}\}>En construcci.*n<\/span>/, 
              `<span style={{fontSize: '0.7rem', color: '#4caf50'}}>Nuevo Ledger</span>`);
fs.writeFileSync('src/components/Layout.jsx', f);
