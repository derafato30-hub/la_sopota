const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', 'utf-8');

f = f.replace("import CocinaTab from './CocinaTab';", "import CocinaTab from './CocinaTab';\nimport CierreTab from './CierreTab';");

f = f.replace("{activeTab === 'CIERRE' && <div>Módulo de Cierre en Construcción...</div>}", "{activeTab === 'CIERRE' && <CierreTab sessionId={session?.id} />}");

fs.writeFileSync('src/pages/ClubCadetes/ClubCadetes.jsx', f);
console.log("Wired CierreTab");
