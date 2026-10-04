const fs = require('fs');
let f = fs.readFileSync('src/components/SuperAdminAuthModal.jsx', 'utf8');
f = f.replace(/otplib\/index/, 'otplib');
fs.writeFileSync('src/components/SuperAdminAuthModal.jsx', f);
console.log('Fixed import');
