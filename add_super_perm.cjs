const fs = require('fs');
let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

f = f.replace(/\{ id: 'colaboradores', name: 'Administrar Colaboradores' \}\r?\n  \];/, "{ id: 'colaboradores', name: 'Administrar Colaboradores' },\n  { id: 'SUPERUSUARIO', name: 'SUPERUSUARIO (Editar Historial)' }\n];");

fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log('Added SUPERUSUARIO permission module');
