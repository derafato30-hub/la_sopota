const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CierreTab.jsx', 'utf-8');

const lines = f.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Sobrante: L.') && lines[i].includes('Faltante: L.')) {
    lines[i] = "            {difference === 0 ? 'Caja Cuadrada Exacta' : difference > 0 ? `Sobrante: L. ${difference.toFixed(2)}` : `Faltante: L. ${Math.abs(difference).toFixed(2)}`}";
    console.log("Fixed line: " + i);
  }
}

fs.writeFileSync('src/pages/ClubCadetes/CierreTab.jsx', lines.join('\n'));
