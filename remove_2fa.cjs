const fs = require('fs');

// 1. Remove 2FA from Colaboradores
let fColab = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');
fColab = fColab.replace(/import TwoFactorSetupModal from '\.\.\/components\/TwoFactorSetupModal';\n?/, '');
fColab = fColab.replace(/const \[show2FAModal, setShow2FAModal\] = useState\(false\);\n?/, '');
fColab = fColab.replace(/\{u\.twoFactorSecret \? \([\s\S]*?<\/button>\n                  \)\}/g, '');
fColab = fColab.replace(/\{\/\* 2FA SETUP MODAL \*\/\}[\s\S]*?<\/TwoFactorSetupModal>\n      \)\}/, '');
fs.writeFileSync('src/pages/Colaboradores.jsx', fColab);

// 2. Simplify SuperAdminAuthModal to only use Password
const modalJSX = `import React, { useState } from 'react';
import { X, ShieldAlert, Lock } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'sonner';

export default function SuperAdminAuthModal({ onSuccess, onCancel, currentUser }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Ingresa tu contrasea para continuar');
      return;
    }

    setLoading(true);
    try {
      // Validate Password
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      toast.success('Autorizacin exitosa (Modo Superusuario)');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Autorizacin fallida. Verifica tu contrasea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="icon-btn" onClick={onCancel}><X size={24}/></button>
        </div>
        
        <ShieldAlert size={48} color="#FF9800" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>Accin de Superusuario</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Esta accin alterar el historial del sistema. Requiere ingresar tu clave para confirmar.
        </p>

        <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> Contrasea Actual
            </label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem', backgroundColor: '#FF9800' }}>
            {loading ? 'Verificando...' : 'Autorizar y Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/components/SuperAdminAuthModal.jsx', modalJSX);
fs.rmSync('src/components/TwoFactorSetupModal.jsx', { force: true });
fs.rmSync('src/utils/totp.js', { force: true });

console.log('Removed 2FA, kept Password Re-Auth');
