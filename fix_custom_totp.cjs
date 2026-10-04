const fs = require('fs');

let f1 = fs.readFileSync('src/components/TwoFactorSetupModal.jsx', 'utf8');
f1 = f1.replace(/import \{ generateSecret, verifySync, generateURI \} from 'otplib';/, "import { generateSecret, verifySync, generateURI } from '../utils/totp';");
f1 = f1.replace(/const isValid = verifySync/g, 'const isValid = await verifySync');
fs.writeFileSync('src/components/TwoFactorSetupModal.jsx', f1);

let f2 = fs.readFileSync('src/components/SuperAdminAuthModal.jsx', 'utf8');
f2 = f2.replace(/import \{ generateSecret, verifySync, generateURI \} from 'otplib';/, "import { verifySync } from '../utils/totp';");
f2 = f2.replace(/const isValid = verifySync/g, 'const isValid = await verifySync');
fs.writeFileSync('src/components/SuperAdminAuthModal.jsx', f2);

console.log('Fixed imports to custom totp');
