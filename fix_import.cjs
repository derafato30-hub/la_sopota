const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace("const { doc, getDoc, updateDoc } = await import('firebase/firestore');", "");

fs.writeFileSync('src/pages/POS.jsx', code);
