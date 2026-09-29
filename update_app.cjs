const fs = require('fs');

let f = fs.readFileSync('src/App.jsx', 'utf-8');

// Add import
f = f.replace("import Finanzas from './pages/Finanzas';", "import Finanzas from './pages/Finanzas';\nimport ClubCadetes from './pages/ClubCadetes/ClubCadetes';");

// Add route
const routeTarget = `<Route path="migrar-db" element={<MigrateDB />} />`;
const routeRep = `<Route path="migrar-db" element={<MigrateDB />} />\n            <Route path="club" element={<ClubCadetes />} />`;

f = f.replace(routeTarget, routeRep);

fs.writeFileSync('src/App.jsx', f);
console.log("App.jsx updated");
