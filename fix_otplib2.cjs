const fs = require('fs');

function updateFile(file) {
  let f = fs.readFileSync(file, 'utf8');
  
  f = f.replace(/import \{ authenticator \} from 'otplib';/, "import { generateSecret, verifySync, generateURI } from 'otplib';");
  f = f.replace(/authenticator\.generateSecret\(\)/g, "generateSecret()");
  f = f.replace(/authenticator\.keyuri\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "generateURI({ label: $1, issuer: $2, secret: $3, strategy: 'totp' })");
  f = f.replace(/authenticator\.verify\(\{\s*token:\s*([^,]+),\s*secret\s*\}\)/g, "verifySync({ token: $1, secret, strategy: 'totp' })");
  
  fs.writeFileSync(file, f);
}

updateFile('src/components/TwoFactorSetupModal.jsx');
updateFile('src/components/SuperAdminAuthModal.jsx');
console.log('Fixed otplib API');
