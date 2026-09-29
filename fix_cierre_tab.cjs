const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CierreTab.jsx', 'utf-8');

// We just replace the exact line using split/join to avoid regex escape hell
const lines = f.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('border:') && lines[i].includes('1px solid') && lines[i].includes('difference === 0')) {
    lines[i] = "          border: difference === 0 ? '1px solid #4CAF50' : difference > 0 ? '1px solid #2196F3' : '1px solid #f44336',";
    console.log("Fixed line: " + i);
  }
}

fs.writeFileSync('src/pages/ClubCadetes/CierreTab.jsx', lines.join('\n'));
