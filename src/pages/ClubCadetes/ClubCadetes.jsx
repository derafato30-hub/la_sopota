import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import MenuTab from './MenuTab';
import IngresoTab from './IngresoTab';
import CocinaTab from './CocinaTab';
import CierreTab from './CierreTab';

export default function ClubCadetes() {
  const [activeTab, setActiveTab] = useState('COCINA');
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    fetchActiveSession();
  }, []);

  const fetchActiveSession = async () => {
    try {
      const q = query(collection(db, 'clubSessions'), where('status', '==', 'OPEN'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSession({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error cargando sesión activa');
    } finally {
      setLoadingSession(false);
    }
  };

  const startSession = async () => {
    if (!confirm('¿Estás seguro de iniciar una nueva sesión de Club de Cadetes?')) return;
    try {
      const docRef = await addDoc(collection(db, 'clubSessions'), {
        date: new Date(),
        status: 'OPEN',
        createdAt: new Date()
      });
      setSession({ id: docRef.id, date: new Date(), status: 'OPEN' });
      toast.success('Sesión de Club iniciada exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión');
    }
  };

  if (loadingSession) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando Club de Cadetes...</div>;
  }

  // Si no hay sesión y no estamos en la pestaña MENÚ, mostrar pantalla de inicio
  if (!session && activeTab !== 'MENU') {
    return (
      <div className="club-cadetes-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
        
        {/* HEADER TABS (Sólo Menú habilitado) */}
        <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: 'var(--border-radius)', border: 'var(--glass-border)' }}>
          <button className="btn-secondary" disabled style={{ flex: 1, opacity: 0.5 }}>Cocina (Despacho)</button>
          <button className="btn-secondary" disabled style={{ flex: 1, opacity: 0.5 }}>Ingresar Pedidos</button>
          <button className="btn-primary" onClick={() => setActiveTab('MENU')} style={{ flex: 1 }}>Menú Club</button>
          <button className="btn-secondary" disabled style={{ flex: 1, opacity: 0.5 }}>Finalizar Club</button>
        </div>

        {/* CONTENIDO START SESIÓN */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h1 style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '1rem' }}>Club de Cadetes</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              No hay ninguna sesión activa del club en este momento. Inicia una nueva sesión para comenzar a procesar pedidos masivos.
            </p>
            <button className="btn-primary" onClick={startSession} style={{ padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '50px' }}>
              <Play size={24} />
              Iniciar Miércoles de Club
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="club-cadetes-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* HEADER TABS */}
      <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: 'var(--border-radius)', border: 'var(--glass-border)' }}>
        <button 
          className={activeTab === 'COCINA' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('COCINA')}
          style={{ flex: 1 }}
        >
          Cocina (Despacho)
        </button>
        <button 
          className={activeTab === 'INGRESO' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('INGRESO')}
          style={{ flex: 1 }}
        >
          Ingresar Pedidos
        </button>
        <button 
          className={activeTab === 'MENU' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('MENU')}
          style={{ flex: 1 }}
        >
          Menú Club
        </button>
        <button 
          className={activeTab === 'CIERRE' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('CIERRE')}
          style={{ flex: 1 }}
        >
          Finalizar Club
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'COCINA' && <CocinaTab sessionId={session?.id} />}
        {activeTab === 'INGRESO' && <IngresoTab sessionId={session?.id} />}
        {activeTab === 'MENU' && <MenuTab />}
        {activeTab === 'CIERRE' && <CierreTab sessionId={session?.id} />}
      </div>

    </div>
  );
}
