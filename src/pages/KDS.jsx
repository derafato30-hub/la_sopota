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

  const getOrderBadge = (type) => {
    if (type === 'LOCAL') {
      return <span className="badge-local">🍽️ LOCAL (Vidrio)</span>;
    } else {
      // Agrupa ENVIO_COBRADO, ENVIO_GRATIS, PARA_LLEVAR
      return <span className="badge-llevar">🎒 EMPACAR (Llevar)</span>;
    }
  };

  const parseItemName = (fullName) => {
    let baseName = fullName;
    let variation = null;
    let sauces = null;
    let tortillasOrExtras = null;

    // Match [Salsas: ...] OR just [...] for Daily Menu sides
    const sauceMatch = baseName.match(/\[Salsas: (.*?)\]/);
    if (sauceMatch) {
      sauces = sauceMatch[1];
      baseName = baseName.replace(sauceMatch[0], '').trim();
    } else {
      const sidesMatch = baseName.match(/\[(.*?)\]/);
      if (sidesMatch) {
        sauces = sidesMatch[1];
        baseName = baseName.replace(sidesMatch[0], '').trim();
      }
    }

    const varMatch = baseName.match(/\((.*?)\)/);
    if (varMatch) {
      variation = varMatch[1];
      baseName = baseName.replace(varMatch[0], '').trim();
    }

    // Match "+ 3 Tortillas" or similar at the end
    const plusMatch = baseName.match(/\+ (.*)/);
    if (plusMatch) {
      tortillasOrExtras = plusMatch[1];
      baseName = baseName.replace(plusMatch[0], '').trim();
    }

    // Clean up any trailing hyphens or spaces
    baseName = baseName.replace(/-\s*$/, '').trim();

    return { baseName, variation, sauces, tortillasOrExtras };
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
        <h3>{order.clientName}</h3>
        {getOrderBadge(order.orderType)}
      </div>
      <div className="kds-time-bar">
        <Clock size={16} />
        <span>{isFuture ? `Agendada: ${order.scheduledTime}` : `Tiempo: ${getElapsedTime(order.createdAt)}`}</span>
      </div>

      <div className="kds-items">
        <ul>
          {order.items.map((item, idx) => {
            const { baseName, variation, sauces, tortillasOrExtras } = parseItemName(item.name);
            return (
              <li key={idx}>
                <div className="kds-item-main">
                  <span className="kds-qty">{item.qty}x</span>
                  <span className="kds-name">{baseName}</span>
                </div>
                
                {(variation || sauces || tortillasOrExtras || (item.addedExtras && item.addedExtras.length > 0)) && (
                  <div className="kds-addons">
                    {variation && <span className="kds-addon-badge var-badge">🔹 {variation}</span>}
                    {sauces && <span className="kds-addon-badge sauce-badge">🥗 {sauces}</span>}
                    {tortillasOrExtras && <span className="kds-addon-badge" style={{backgroundColor: '#f59e0b', color: '#000', border: '2px solid #000'}}>🌮 {tortillasOrExtras}</span>}
                    
                    {item.addedExtras && item.addedExtras.map((ext, i) => (
                      <span key={i} className="kds-addon-badge" style={{backgroundColor: '#ec4899', color: '#000', border: '2px solid #000'}}>
                        ➕ {ext.name}
                      </span>
                    ))}
                  </div>
                )}

                {item.comment && (
                  <div className="kds-comment-container">
                    <span className="kds-comment-icon">⚠️</span>
                    <div className="kds-comment-text">OJO: {item.comment.toUpperCase()}</div>
                  </div>
                )}
              </li>
            );
          })}
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
