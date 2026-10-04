const fs = require('fs');
let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

const target = `<td style={{ padding: '1rem' }}>
                  {u.requirePasswordChange ? (
                    <div style={{ color: '#FF9800', fontSize: '0.85rem', marginBottom: '0.25rem' }}>⚠️ Clave Temporal</div>
                  ) : (
                    <div style={{ color: '#4CAF50', fontSize: '0.85rem', marginBottom: '0.25rem' }}>✓ Clave Privada</div>
                  )}
                  {u.twoFactorSecret ? (
                    <div style={{ color: '#9C27B0', fontSize: '0.85rem', fontWeight: 'bold' }}>🛡️ 2FA Activo</div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>2FA Inactivo</div>
                  )}
                  {u.uid === currentUser.uid && !u.twoFactorSecret && (
                     <button onClick={() => setShow2FAModal(true)} style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Configurar 2FA</button>
                  )}
                  {u.uid === currentUser.uid && u.twoFactorSecret && (
                     <button onClick={() => setShow2FAModal(true)} style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', borderRadius: '4px', cursor: 'pointer' }}>Re-configurar 2FA</button>
                  )}
                </td>`;

f = f.replace(/<td style=\{\{ padding: '1rem' \}\}>\s*\{u\.requirePasswordChange \? \([\s\S]*?<\/td>/, target);
fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log('Fixed exactly');
