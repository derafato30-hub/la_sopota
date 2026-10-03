const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf-8');
f = f.replace("from '../../../firebase'", "from '../../firebase'");
f = f.replace("from '../../../utils/aiService'", "from '../../utils/aiService'");
fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Fixed imports");
