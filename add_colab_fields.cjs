const fs = require('fs');
let content = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

// 1. Add state variables
content = content.replace(
  /const \[newName, setNewName\] = useState\(''\);/,
  "const [newName, setNewName] = useState('');\n  const [newPhone, setNewPhone] = useState('');\n  const [newIdentity, setNewIdentity] = useState('');\n  const [newAddress, setNewAddress] = useState('');"
);

// 2. Add to Firestore save
content = content.replace(
  /role: newRole,/,
  "role: newRole,\n        phone: newPhone,\n        identity: newIdentity,\n        address: newAddress,"
);

// 3. Reset form
content = content.replace(
  /setNewEmail\(''\); setNewName\(''\); setNewPassword\('Sopota2026'\);/,
  "setNewEmail(''); setNewName(''); setNewPhone(''); setNewIdentity(''); setNewAddress(''); setNewPassword('Sopota2026');"
);

// 4. Update Table Headers
content = content.replace(
  /<th style=\{\{ padding: '1rem' \}\}>Usuario<\/th>/,
  "<th style={{ padding: '1rem' }}>Usuario</th>\n              <th style={{ padding: '1rem' }}>Datos Personales</th>"
);
content = content.replace(/colSpan="5"/g, 'colSpan="6"');

// 5. Update Table Body
content = content.replace(
  /<\/td>\s*<td style=\{\{ padding: '1rem' \}\}>\s*<span className="badge"/,
  "</td>\n                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>\n                  {u.identity && <div><strong>DNI:</strong> {u.identity}</div>}\n                  {u.phone && <div><strong>Tel:</strong> {u.phone}</div>}\n                  {u.address && <div style={{ color: 'var(--text-secondary)' }}>{u.address}</div>}\n                  {(!u.identity && !u.phone) && <span style={{ color: 'var(--text-secondary)' }}>N/A</span>}\n                </td>\n                <td style={{ padding: '1rem' }}>\n                  <span className=\"badge\""
);

// 6. Update Form UI
const newFields = `
              <div className="form-group">
                <label>Nmero de Identidad</label>
                <input type="text" placeholder="Ej. 0801-1990-12345" value={newIdentity} onChange={e => setNewIdentity(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Telfono</label>
                <input type="tel" placeholder="Ej. 9988-7766" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Direccin Exacta</label>
                <textarea rows="2" placeholder="Direccin de residencia..." value={newAddress} onChange={e => setNewAddress(e.target.value)}></textarea>
              </div>
`;

content = content.replace(
  /<div className="form-group">\s*<label>Rol Inicial \(Plantilla de Permisos\)<\/label>/,
  newFields + '\n              <div className="form-group">\n                <label>Rol Inicial (Plantilla de Permisos)</label>'
);

fs.writeFileSync('src/pages/Colaboradores.jsx', content);
console.log('Updated Colaboradores with extra fields');
