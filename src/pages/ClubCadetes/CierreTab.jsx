import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Calculator, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CierreTab({ sessionId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const [cash, setCash] = useState('');
  const [transfer, setTransfer] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [sessionId]);

  const fetchOrders = async () => {
    if (!sessionId) return;
    try {
      const q = query(collection(db, 'clubOrders'), where('sessionId', '==', sessionId));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando datos de cierre');
    } finally {
      setLoading(false);
    }
  };

  const totalExpected = orders.reduce((acc, order) => acc + (order.price || 0), 0);
  const totalReported = (parseFloat(cash) || 0) + (parseFloat(transfer) || 0);
  const difference = totalReported - totalExpected;

  const handleCloseSession = async () => {
    if (!confirm('¿Estás seguro de finalizar el club? Esto archivará todos los pedidos de la cocina e inyectará los ingresos en finanzas.')) return;
    
    setClosing(true);
    try {
      await updateDoc(doc(db, 'clubSessions', sessionId), {
        status: 'CLOSED',
        closedAt: new Date(),
        totalExpected,
        reportedCash: parseFloat(cash) || 0,
        reportedTransfer: parseFloat(transfer) || 0,
        difference
      });
      
      toast.success('Sesión de Club Finalizada. Datos guardados.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      toast.error('Error al cerrar la sesión');
      setClosing(false);
    }
  };

  if (loading) return <div>Cargando datos del evento...</div>;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator size={28} color="var(--primary-color)" />
          Cierre de Caja (Club de Cadetes)
        </h2>

        {pendingOrders > 0 && (
          <div style={{ background: 'rgba(255, 152, 0, 0.1)', border: '1px solid #ff9800', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AlertTriangle color="#ff9800" size={24} />
            <p style={{ margin: 0, color: '#ff9800', fontSize: '0.95rem' }}>
              <strong>Advertencia:</strong> Aún hay {pendingOrders} platillos sin servir en la cocina. Puedes cerrar la caja, pero ten en cuenta que el despacho podría no haber terminado.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px' }}>
          <span>Total Platillos Vendidos:</span>
          <strong>{totalOrders}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
          <span style={{ fontSize: '1.2rem' }}>Dinero Esperado (Total):</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>L. {totalExpected.toFixed(2)}</strong>
        </div>

        <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Declaración del Efectivo Entregado</h4>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Total en Efectivo (Billetes)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00"
              value={cash}
              onChange={e => setCash(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Total en Banco (Transferencias)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00"
              value={transfer}
              onChange={e => setTransfer(e.target.value)}
            />
          </div>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          borderRadius: '8px',
          background: difference === 0 ? 'rgba(76, 175, 80, 0.1)' : difference > 0 ? 'rgba(33, 150, 243, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: \`1px solid \${difference === 0 ? '#4CAF50' : difference > 0 ? '#2196F3' : '#f44336'}\`,
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, color: difference === 0 ? '#4CAF50' : difference > 0 ? '#2196F3' : '#f44336' }}>
            {difference === 0 ? 'Caja Cuadrada Exacta' : difference > 0 ? \`Sobrante: L. \${difference.toFixed(2)}\` : \`Faltante: L. \${Math.abs(difference).toFixed(2)}\`}
          </h3>
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
          onClick={handleCloseSession}
          disabled={closing}
        >
          <CheckCircle size={20} />
          {closing ? 'Procesando Cierre...' : 'Finalizar Club de Cadetes'}
        </button>

      </div>
    </div>
  );
}
