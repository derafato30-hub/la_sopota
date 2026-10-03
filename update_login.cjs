const fs = require('fs');

let f = fs.readFileSync('src/pages/Login.jsx', 'utf8');

// Import useLocation and sendPasswordResetEmail
f = f.replace(/import \{ useNavigate \} from 'react-router-dom';/, "import { useNavigate, useLocation } from 'react-router-dom';\nimport { sendPasswordResetEmail } from 'firebase/auth';\nimport { toast } from 'sonner';");

// Get state
f = f.replace(/const navigate = useNavigate\(\);/, "const navigate = useNavigate();\n  const location = useLocation();");

// Add useEffect to show suspended error
f = f.replace(/const handleLogin = async \(e\) => \{/, `
  // Show error if redirected due to suspension
  useState(() => {
    if (location.state?.error === 'CUENTA_SUSPENDIDA') {
      auth.signOut();
      setError('Esta cuenta ha sido suspendida por el administrador.');
    }
  });

  const handleReset = async () => {
    if (!email) {
      toast.error('Ingresa tu correo electrnico primero');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Correo de recuperacin enviado a ' + email);
    } catch (e) {
      toast.error('Error enviando correo: ' + e.message);
    }
  };

  const handleLogin = async (e) => {`);

// Add forgot password button
f = f.replace(/<button disabled=\{loading\} type="submit" className="btn-primary login-btn">/g, `<div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Olvid mi contrasea
            </button>
          </div>
          <button disabled={loading} type="submit" className="btn-primary login-btn">`);

fs.writeFileSync('src/pages/Login.jsx', f);
console.log("Updated Login.jsx");
