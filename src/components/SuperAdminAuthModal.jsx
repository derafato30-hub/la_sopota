import React, { useState } from 'react';
import { X, ShieldAlert, Lock, Smartphone } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { verifySync } from '../utils/totp';
import { auth, db } from '../firebase';
import { toast } from 'sonner';

export default function SuperAdminAuthModal({ onSuccess, onCancel, currentUser }) {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!password || !otp) {
      toast.error('Ingresa ambos datos para continuar');
      return;
    }

    setLoading(true);
    try {
      // 1. Validate Password
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Fetch TOTP Secret
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || !userDoc.data().twoFactorSecret) {
        toast.error('Este usuario no tiene el 2FA (Google Authenticator) configurado.');
        setLoading(false);
        return;
      }

      const secret = userDoc.data().twoFactorSecret;
      
      // 3. Verify OTP
      const isValid = await verifySync({ token: otp, secret, strategy: 'totp' });
      
      if (!isValid) {
        toast.error('El cdigo de Authenticator es incorrecto o est vencido.');
        setLoading(false);
        return;
      }

      // Success!
      toast.success('Autorizacin exitosa (Modo Superusuario)');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Autorizacin fallida. Verifica tu contrasea y cdigo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="icon-btn" onClick={onCancel}><X size={24}/></button>
        </div>
        
        <ShieldAlert size={48} color="#FF9800" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>Accin de Superusuario</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Esta accin alterar el historial del sistema. Requiere re-autenticacin obligatoria.
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
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={16} /> Cdigo Authenticator (6 dgitos)
            </label>
            <input 
              type="text" 
              required 
              maxLength="6"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
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
