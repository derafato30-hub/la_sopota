const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', 'utf-8');

f = f.replace("import MenuTab from './MenuTab';", "import MenuTab from './MenuTab';\nimport IngresoTab from './IngresoTab';");

f = f.replace("{activeTab === 'INGRESO' && <div>Módulo de Ingreso en Construcción...</div>}", "{activeTab === 'INGRESO' && <IngresoTab sessionId={session?.id} />}");

fs.writeFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', f);
console.log("Wired IngresoTab");
