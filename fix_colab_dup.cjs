const fs = require('fs');
let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

f = f.replace(/\{u\.uid === currentUser\.uid && u\.twoFactorSecret && \([\s\S]*?<\/span>\n                  \)\}/, `{u.uid === currentUser.uid && u.twoFactorSecret && (
                     <button onClick={() => setShow2FAModal(true)} style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', borderRadius: '4px', cursor: 'pointer' }}>Re-configurar 2FA</button>
                  )}`);

fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log("Fixed duplication");
