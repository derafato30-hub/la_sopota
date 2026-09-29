import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

const YEARS = ['I año', 'II año', 'III año', 'IV año', 'Extra'];

export default function CocinaTab({ sessionId }) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedDishId, setSelectedDishId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Fetch menu
  useEffect(() => {
    const fetchMenu = async () => {
      // Usamos el menú interno del club (no hace falta onSnapshot para el menú aquí, basta un query normal)
      import('firebase/firestore').then(({ getDocs }) => {
        getDocs(collection(db, 'clubMenuItems')).then(snap => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setMenuItems(list);
        });
      });
    };
    fetchMenu();
  }, []);

  // Listen to orders for current session
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'clubOrders'), where('sessionId', '==', sessionId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error('Error sincronizando cocina');
    });
    return () => unsubscribe();
  }, [sessionId]);

  const handleToggleStatus = async (order) => {
    try {
      const newStatus = order.status === 'PENDING' ? 'SERVED' : 'PENDING';
      await updateDoc(doc(db, 'clubOrders', order.id), { status: newStatus });
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar estado");
    }
  };

  // Filtrado
  const filteredOrders = orders.filter(o => selectedDishId === 'ALL' || o.dishId === selectedDishId);

  // Math Totales Globales del Filtro
  const totalFiltered = filteredOrders.length;
  const pendingFiltered = filteredOrders.filter(o => o.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* BARRA DE BÚSQUEDA / FILTRO */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
        <Search size={24} color="var(--text-secondary)" />
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <select 
            className="input-field" 
            value={selectedDishId} 
            onChange={e => setSelectedDishId(e.target.value)}
            style={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            <option value="ALL">-- Ver Todos los Pedidos --</option>
            {menuItems.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Pedidos (Filtro)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalFiltered}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Por Servir</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: pendingFiltered > 0 ? '#ff9800' : '#4CAF50' }}>{pendingFiltered}</div>
          </div>
        </div>
      </div>

      {/* COLUMNAS FIJAS */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', overflow: 'hidden' }}>
        {YEARS.map(year => {
          const yearOrders = filteredOrders.filter(o => o.year === year);
          const yearPending = yearOrders.filter(o => o.status === 'PENDING').length;

          return (
            <div key={year} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{year}</h3>
                <span className="badge" style={{ backgroundColor: yearPending > 0 ? 'rgba(255, 152, 0, 0.2)' : 'rgba(76, 175, 80, 0.2)', color: yearPending > 0 ? '#ff9800' : '#4CAF50' }}>
                  Faltan: {yearPending}
                </span>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                {yearOrders.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem', fontSize: '0.9rem' }}>N/A</p>
                ) : (
                  yearOrders.map(order => (
                    <div 
                      key={order.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        background: order.status === 'SERVED' ? 'var(--surface-hover)' : 'rgba(255, 152, 0, 0.05)', 
                        padding: '0.5rem', 
                        borderRadius: '8px',
                        border: order.status === 'SERVED' ? '1px solid transparent' : '1px solid rgba(255, 152, 0, 0.2)',
                        opacity: order.status === 'SERVED' ? 0.6 : 1
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={order.status === 'SERVED'}
                        onChange={() => handleToggleStatus(order)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.cadetName}
                        </span>
                        {selectedDishId === 'ALL' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.dishName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
