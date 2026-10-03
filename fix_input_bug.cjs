const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

// Find the handleImageUpload function and add the reset line at the very end
const target = `setIsScanning(false);
    }`;
const replacement = `setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }`;

f = f.replace(target, replacement);

fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Fixed onChange bug");
