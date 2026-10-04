const fs = require('fs');
let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

// Remove the state just in case it's still there
f = f.replace(/const \[show2FAModal, setShow2FAModal\] = useState\(false\);\r?\n?/, '');

// Remove the import just in case
f = f.replace(/import TwoFactorSetupModal.*?\r?\n?/, '');

// Remove the buttons
f = f.replace(/\{u\.twoFactorSecret \? \([\s\S]*?<\/button>\r?\n\s*\)\}/g, '');

// Clean up remaining fragments manually using a more resilient replacement
f = f.replace(/\{u\.twoFactorSecret \? \([\s\S]*?2FA Inactivo<\/div>\r?\n\s*\)\}/, '');
f = f.replace(/\{u\.uid === currentUser\.uid && !u\.twoFactorSecret && \([\s\S]*?Configurar 2FA<\/button>\r?\n\s*\)\}/, '');
f = f.replace(/\{u\.uid === currentUser\.uid && u\.twoFactorSecret && \([\s\S]*?Re-configurar 2FA<\/button>\r?\n\s*\)\}/, '');

// Remove the modal
f = f.replace(/\{\/\* 2FA SETUP MODAL \*\/\}[\s\S]*?<TwoFactorSetupModal[\s\S]*?\/>\r?\n\s*\)\}/, '');

fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log('Fixed Colaboradores regex');
