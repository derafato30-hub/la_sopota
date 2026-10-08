const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/model: "gemini-1\.5-flash"/g, 'model: "gemini-flash-latest"');

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed model name');
