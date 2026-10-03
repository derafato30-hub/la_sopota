const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');
f = f.replace("from '../../../firebase'", "from '../../firebase'");
fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("Fixed path");
