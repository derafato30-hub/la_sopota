const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', 'utf-8');

f = f.replace("import IngresoTab from './IngresoTab';", "import IngresoTab from './IngresoTab';\nimport CocinaTab from './CocinaTab';");

f = f.replace("{activeTab === 'COCINA' && <div>Módulo de Cocina en Construcción... (Sesión: {session?.id})</div>}", "{activeTab === 'COCINA' && <CocinaTab sessionId={session?.id} />}");

fs.writeFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', f);
console.log("Wired CocinaTab");
