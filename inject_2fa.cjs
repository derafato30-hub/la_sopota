const fs = require('fs');

let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

// Imports
f = f.replace(/import \{ db, auth as primaryAuth \} from '\.\.\/firebase';/, "import { db, auth as primaryAuth } from '../firebase';\nimport TwoFactorSetupModal from '../components/TwoFactorSetupModal';\nimport { useAuth } from '../context/AuthContext';");

// Add useAuth
f = f.replace(/export default function Colaboradores\(\) \{/, "export default function Colaboradores() {\n  const { currentUser } = useAuth();\n  const [show2FAModal, setShow2FAModal] = useState(false);\n");

// Update table header to include 2FA status
// Wait, the table already has "Seguridad" which shows "Clave Temporal / Clave Privada". We can append 2FA status there!
f = f.replace(/<td style=\{\{ padding: '1rem' \}\}>\s*\{u\.requirePasswordChange \?/m, `<td style={{ padding: '1rem' }}>
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
                  )}`);

// Render modal at the end
f = f.replace(/    <\/div>\n  \);\n\}\n$/, `      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <TwoFactorSetupModal 
          currentUser={currentUser}
          onCancel={() => setShow2FAModal(false)}
          onComplete={(secret) => {
            setShow2FAModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
`);

fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log("Updated Colaboradores.jsx with 2FA setup");
