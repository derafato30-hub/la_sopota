const fs = require('fs');

let f = fs.readFileSync('src/components/TwoFactorSetupModal.jsx', 'utf8');
f = f.replace(/import QRCode from 'qrcode';/, "import * as QRCode from 'qrcode';");
fs.writeFileSync('src/components/TwoFactorSetupModal.jsx', f);
console.log('Fixed qrcode import');
