import React, { useState, useEffect } from 'react';
import { X, Smartphone, Save, Copy } from 'lucide-react';
import { generateSecret, verifySync, generateURI } from '../utils/totp';
import * as QRCode from 'qrcode';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

export default function TwoFactorSetupModal({ currentUser, onComplete, onCancel }) {
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('TwoFactorSetupModal mounted!');
    try {
    // Generar un secreto nico al abrir el modal
    const newSecret = generateSecret();
    setSecret(newSecret);

    // Generar URL del QR (Issuer: La Sopota, Account: Email del usuario)
    const otpauth = generateURI({ label: currentUser.email, issuer: 'La Sopota', secret: newSecret, strategy: 'totp' });
    
    QRCode.toDataURL(otpauth, (err, imageUrl) => {
      if (err) {
        console.error(err);
        toast.error('Error generando Cdigo QR');
      } else {
        setQrUrl(imageUrl);
      }
    });
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secreto copiado al portapapeles');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    
    setLoading(true);
    try {
      const isValid = await verifySync({ token: otp, secret, strategy: 'totp' });
      
      if (!isValid) {
        toast.error('El cdigo ingresado es incorrecto. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Si es vlido, guardar el secreto en el documento del usuario
      await updateDoc(doc(db, 'users', currentUser.uid), {
        twoFactorSecret: secret
      });

      toast.success('Autenticacin de 2 Factores configurada con xito!');
      onComplete(secret);
    } catch (err) {
      console.error(err);
      toast.error('Error guardando la configuracin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="icon-btn" onClick={onCancel}><X size={24}/></button>
        </div>

        <Smartphone size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
        <h2>Configurar Google Authenticator</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Escanea este cdigo QR con tu aplicacin de Google Authenticator o Authy para vincular tu dispositivo.
        </p>

        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" style={{ width: '200px', height: '200px', margin: '0 auto' }} />
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Generando QR...
          </div>
        )}

        <div style={{ margin: '1rem 0', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Si no puedes escanear el QR, ingresa este cdigo manualmente:</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <strong style={{ letterSpacing: '0.1rem' }}>{secret}</strong>
            <button className="icon-btn" onClick={handleCopy} title="Copiar"><Copy size={16}/></button>
          </div>
        </div>

        <form onSubmit={handleVerify} style={{ marginTop: '1.5rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Ingresa el cdigo de 6 dgitos para confirmar</label>
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
          <button type="submit" className="btn-primary" disabled={loading || !otp} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Verificando...' : 'Verificar y Activar 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
}
