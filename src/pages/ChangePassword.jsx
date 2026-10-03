import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import './Login.css';

export default function ChangePassword() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La contrasea debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // 1. Update password in Firebase Auth
      await updatePassword(currentUser, newPassword);
      
      // 2. Remove flag in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        requirePasswordChange: false
      });
      
      toast.success('Contrasea actualizada con xito');
      navigate('/');
      
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar la contrasea. Intente cerrar sesin y volver a entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <ShieldCheck size={48} color="var(--primary-color)" />
          <h2>Actualizacin Requerida</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Por tu seguridad, debes cambiar la contrasea temporal asignada por el administrador antes de continuar.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nueva Contrasea Privada</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                placeholder="Mnimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Confirmar Contrasea</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input 
                type="password" 
                placeholder="Vuelve a escribir la contrasea"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
