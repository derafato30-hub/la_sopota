const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');
f = f.replace(/\\`/g, '`');
f = f.replace(/\\\$/g, '$');
fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("Fixed CocinaTab");
