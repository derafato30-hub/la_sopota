import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { ChefHat, CheckCircle, Clock } from 'lucide-react';
import './KDS.css';

export default function KDS() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Escuchar órdenes en tiempo real que no estén completadas ni canceladas
    const q = query(
      collection(db, 'orders'),
      where('estadoCocina', 'in', ['PENDIENTE', 'PREPARANDO'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let ordersData = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar localmente por fecha de creación (más antiguo primero)
      ordersData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });

      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const changeStatus = async (orderId, newStatus, clientName) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { estadoCocina: newStatus });
      await logAuditAction(
        'ACTUALIZAR_ORDEN', 
        'KDS', 
        `Orden de ${clientName} movida a ${newStatus}`, 
        currentUser
      );
    } catch (error) {
      console.error("Error cambiando el estado de la orden:", error);
    }
  };

  const getElapsedTime = (timestamp) => {
    if (!timestamp) return '0 min';
    const diffMs = Date.now() - timestamp.toMillis();
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} min`;
  };

  const isScheduledForFuture = (scheduledTimeStr) => {
    if (!scheduledTimeStr) return false;
    const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    return scheduledDate > currentTime;
  };

  const activeOrders = [];
  const futureOrders = [];

  orders.forEach(o => {
    if (isScheduledForFuture(o.scheduledTime)) {
      futureOrders.push(o);
    } else {
      activeOrders.push(o);
    }
  });

  const renderOrderCard = (order, isFuture = false) => (
    <div key={order.id} className={`kds-card status-${(order.estadoCocina || '').toLowerCase()}`} style={{ opacity: isFuture ? 0.7 : 1 }}>
      <div className="kds-card-header">
        <h3>{order.clientName} <span>({order.orderType})</span></h3>
        <div className="kds-time">
          <Clock size={16} />
          <span>{isFuture ? `Agendada: ${order.scheduledTime}` : getElapsedTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="kds-items">
        <ul>
          {order.items.map((item, idx) => (
            <li key={idx}>
              <strong>{item.qty}x</strong> {item.name}
              {item.comment && <div className="kds-comment">💬 {item.comment}</div>}
            </li>
          ))}
        </ul>
      </div>

      <div className="kds-actions">
        {order.estadoCocina === 'PENDIENTE' && (
          <button 
            className="btn-secondary" 
            onClick={() => changeStatus(order.id, 'PREPARANDO', order.clientName)}
          >
            Cocinar Ahora
          </button>
        )}
        
        {order.estadoCocina === 'PREPARANDO' && (
          <button 
            className="btn-primary ready-btn" 
            onClick={() => changeStatus(order.id, 'LISTO', order.clientName)}
          >
            <CheckCircle size={20} /> ¡Platillo Listo!
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="kds-container">
      <div className="kds-header">
        <h1><ChefHat size={32} /> Kitchen Display System (KDS)</h1>
        <p>Órdenes urgentes: {activeOrders.length}</p>
      </div>

      <div className="kds-grid">
        {activeOrders.length === 0 && (
          <div className="kds-empty">
            <ChefHat size={64} opacity={0.2} />
            <h2>No hay órdenes urgentes</h2>
            <p>La cocina está al día. ¡Buen trabajo!</p>
          </div>
        )}

        {activeOrders.map((order) => renderOrderCard(order, false))}
      </div>

      {futureOrders.length > 0 && (
        <>
          <div className="kds-header" style={{marginTop: '2rem', borderTop: '2px solid var(--border-color)', paddingTop: '1rem'}}>
            <h2><Clock size={24} /> Órdenes Programadas a Futuro</h2>
            <p>{futureOrders.length} esperando su hora</p>
          </div>
          <div className="kds-grid">
            {futureOrders.map((order) => renderOrderCard(order, true))}
          </div>
        </>
      )}
    </div>
  );
}
