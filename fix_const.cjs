const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/const model = genAI.getGenerativeModel/g, 'let model = genAI.getGenerativeModel');

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed let model');
