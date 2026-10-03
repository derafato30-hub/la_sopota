const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');
f = f.replace(/item.apellido \|\|/g, "item.apellido || item.apellidos ||");
fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Fixed apellidos");
