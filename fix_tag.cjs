const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/<strong style=\{\{ color: 'var\(--primary-color\)' \}\}>Asesor IA: Hola/, `<strong style={{ color: 'var(--primary-color)' }}>Asesor IA:</strong> Hola`);

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed strong tag');
