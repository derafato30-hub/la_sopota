import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAuditAction } from '../utils/auditLogger';
import { ChefHat, CheckCircle, Clock } from 'lucide-react';
import './KDS.css';

export default function KDS() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const isInitialSnapshot = useRef(true);

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
      let hasNewOrders = false;

      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });

      if (!isInitialSnapshot.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            hasNewOrders = true;
          }
        });

        if (hasNewOrders) {
          try {
            const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=ding-idea-40142.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('El navegador bloqueó el audio automático', e));
            toast.info('¡Nueva Orden Entrante!');
          } catch (err) {}
        }
      }
      
      isInitialSnapshot.current = false;
      
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

  const toggleItemCheck = async (order, idx) => {
    try {
      const newItems = [...order.items];
      newItems[idx].checked = !newItems[idx].checked;
      await updateDoc(doc(db, 'orders', order.id), { items: newItems });
    } catch(error) {
      console.error("Error actualizando checkbox:", error);
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
      return <span className="badge-local">COMER AQUÍ</span>;
    } else {
      return <span className="badge-llevar">LLEVAR</span>;
    }
  };
  
  const getCardTypeClass = (type) => {
    return type === 'LOCAL' ? 'card-local' : 'card-llevar';
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
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: isFuture ? 0.7 : 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, info) => {
        if (info.offset.x > 150) {
          const nextStatus = 'LISTO';
          changeStatus(order.id, nextStatus, order.clientName);
          toast.success(`${order.clientName} -> ${nextStatus}`);
        }
      }}
      key={order.id} 
      className={`kds-card ${getCardTypeClass(order.orderType)} status-${(order.estadoCocina || '').toLowerCase()}`}
    >
      <div className="kds-card-header">
        <div className="kds-card-title">
          <h3>{order.clientName}</h3>
          {getOrderBadge(order.orderType)}
        </div>
        <div className="kds-time-bar">
          <Clock size={14} />
          <span>{isFuture ? order.scheduledTime : getElapsedTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="kds-items">
        <ul>
          {order.items.map((item, idx) => {
            const { baseName, variation, sauces, tortillasOrExtras } = parseItemName(item.name);
            const isChecked = item.checked;
            
            return (
              <li 
                key={idx}
                onClick={() => toggleItemCheck(order, idx)}
                style={{
                  cursor: 'pointer',
                  opacity: isChecked ? 0.4 : 1,
                  textDecoration: isChecked ? 'line-through' : 'none',
                  backgroundColor: isChecked ? 'rgba(0,0,0,0.2)' : undefined,
                  transition: 'all 0.2s',
                  borderRadius: '4px'
                }}
              >
                <div className="kds-item-main" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <input 
                    type="checkbox"
                    checked={!!isChecked}
                    readOnly
                    style={{ transform: 'scale(1.5)', margin: 0, cursor: 'pointer' }}
                  />
                  <span className="kds-qty">{item.qty}x</span>
                  <span className="kds-name">{baseName}</span>
                </div>
                
                {(variation || sauces || tortillasOrExtras || (item.addedExtras && item.addedExtras.length > 0)) && (
                  <div className="kds-addons">
                    {variation && <span className="kds-addon-text var-text">🔹 {variation}</span>}
                    {sauces && <span className="kds-addon-text sauce-text">🥗 {sauces}</span>}
                    {tortillasOrExtras && <span className="kds-addon-text extra-text">🌮 {tortillasOrExtras}</span>}
                    
                    {item.addedExtras && item.addedExtras.map((ext, i) => (
                      <span key={i} className="kds-addon-text add-text">
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
        { (order.estadoCocina === 'PENDIENTE' || order.estadoCocina === 'PREPARANDO') && (
          <button 
            className="btn-primary ready-btn" 
            onClick={() => changeStatus(order.id, 'LISTO', order.clientName)}
          >
            <CheckCircle size={20} /> ¡Platillo Listo!
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="kds-container">
      <div className="kds-header">
        <h1><ChefHat size={32} /> Kitchen Display System (KDS)</h1>
        <p>Órdenes urgentes: {activeOrders.length}</p>
      </div>

      <motion.div layout className="kds-grid">
        <AnimatePresence>
          {activeOrders.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="kds-empty"
            >
              <ChefHat size={64} opacity={0.2} />
              <h2>No hay órdenes urgentes</h2>
              <p>La cocina está al día. ¡Buen trabajo!</p>
            </motion.div>
          )}

          {activeOrders.map((order) => renderOrderCard(order, false))}
        </AnimatePresence>
      </motion.div>

      {futureOrders.length > 0 && (
        <>
          <h2 className="kds-future-title">Órdenes Agendadas ({futureOrders.length})</h2>
          <motion.div layout className="kds-grid future-grid">
            <AnimatePresence>
              {futureOrders.map((order) => renderOrderCard(order, true))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
