import React from 'react';
import { Users, Construction } from 'lucide-react';

export default function Colaboradores() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Users size={64} color="var(--primary-color)" />
      </div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>Módulo de Colaboradores</h1>
      
      <div style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', border: '1px solid #FF9800', padding: '2rem', borderRadius: '12px', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Construction size={48} color="#FF9800" />
        <h2 style={{ color: '#FF9800', margin: 0 }}>¡Próximamente!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>
          Estamos trabajando en el módulo de gestión de colaboradores. 
          Aquí podrás registrar usuarios, asignar roles, permisos y controlar accesos al sistema.
        </p>
      </div>
    </div>
  );
}
