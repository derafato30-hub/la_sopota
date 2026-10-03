const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

f = f.replace(/setIsScanning\(false\);/g, "setIsScanning(false); if(fileInputRef.current) fileInputRef.current.value = '';");

fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Fixed setIsScanning");
