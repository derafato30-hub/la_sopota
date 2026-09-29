const fs = require('fs');

const fixFirebase = (file) => {
  let f = fs.readFileSync(file, 'utf-8');
  f = f.replace("from '../../../firebase';", "from '../../firebase';");
  fs.writeFileSync(file, f);
}

fixFirebase('src/pages/ClubCadetes/MenuTab.jsx');
fixFirebase('src/pages/ClubCadetes/IngresoTab.jsx');
fixFirebase('src/pages/ClubCadetes/CocinaTab.jsx');

let fCierre = fs.readFileSync('src/pages/ClubCadetes/CierreTab.jsx', 'utf-8');
fCierre = fCierre.replace("from '../../../firebase';", "from '../../firebase';");
// Fix backticks
fCierre = fCierre.replace(/border: `1px solid \${difference === 0 \? '#4CAF50' : difference > 0 \? '#2196F3' : '#f44336'}`/g, "border: difference === 0 ? '1px solid #4CAF50' : difference > 0 ? '1px solid #2196F3' : '1px solid #f44336'");

fs.writeFileSync('src/pages/ClubCadetes/CierreTab.jsx', fCierre);
console.log("Fixed imports and syntax");
