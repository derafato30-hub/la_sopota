import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'sonner';
import { Search, Printer } from 'lucide-react';

const YEARS = ['I año', 'II año', 'III año', 'IV año', 'Extra'];

export default function CocinaTab({ sessionId }) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedDishId, setSelectedDishId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Fetch menu
  useEffect(() => {
    import('firebase/firestore').then(({ getDocs }) => {
      getDocs(collection(db, 'clubMenuItems')).then(snap => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setMenuItems(list);
      });
    });
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    let htmlContent = `
      <html>
        <head>
          <title>Listas de Club de Cadetes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            .year-section { margin-bottom: 30px; page-break-inside: avoid; }
            h2 { border-bottom: 2px solid #000; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .totals { margin-top: 20px; border: 2px solid #000; padding: 15px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; margin-bottom: 20px; cursor: pointer;">Imprimir</button>
          <h1>Listas de Club de Cadetes</h1>
    `;

    // Resumen General
    htmlContent += `<div class="totals"><h3>Resumen Total a Cocinar:</h3><ul>`;
    const dishTotals = menuItems.map(dish => {
      const dishOrders = orders.filter(o => o.dishId === dish.id);
      return { name: dish.name, total: dishOrders.length };
    }).filter(d => d.total > 0);
    
    dishTotals.forEach(d => {
      htmlContent += `<li><strong>${d.name}:</strong> ${d.total} porciones</li>`;
    });
    htmlContent += `</ul></div><br/>`;

    // Listas por año
    YEARS.forEach(year => {
      const yearOrders = orders.filter(o => o.year === year);
      if (yearOrders.length > 0) {
        htmlContent += `
          <div class="year-section">
            <h2>${year} (Total: ${yearOrders.length})</h2>
            <table>
              <thead>
                <tr>
                  <th width="50%">Nombre</th>
                  <th width="30%">Platillo</th>
                  <th width="20%">Entregado</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        // Sort by dish, then name
        yearOrders.sort((a,b) => a.dishName.localeCompare(b.dishName) || a.cadetName.localeCompare(b.cadetName));
        
        yearOrders.forEach(o => {
          htmlContent += `
            <tr>
              <td>${o.cadetName}</td>
              <td>${o.dishName}</td>
              <td style="text-align: center;">[ &nbsp; &nbsp; &nbsp; ]</td>
            </tr>
          `;
        });

        htmlContent += `</tbody></table></div>`;
      }
    });

    htmlContent += `</body></html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filtrado
  const filteredOrders = orders.filter(o => selectedDishId === 'ALL' || o.dishId === selectedDishId);

  // Totales por platillo para la barra inferior
  const dynamicDishTotals = menuItems.map(dish => {
    const dishOrders = orders.filter(o => o.dishId === dish.id);
    const total = dishOrders.length;
    const pending = dishOrders.filter(o => o.status === 'PENDING').length;
    return { id: dish.id, name: dish.name, total, pending };
  }).filter(d => d.total > 0);

  // Math Totales Globales del Filtro
  const totalFiltered = filteredOrders.length;
  const pendingFiltered = filteredOrders.filter(o => o.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* BARRA SUPERIOR: BÚSQUEDA Y BOTÓN IMPRIMIR */}
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

        <button className="btn-secondary" onClick={handlePrint} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Printer size={18} />
          Imprimir Listas
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filtro Actual</span>
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
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', flexShrink: 0 }}
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

      {/* BARRA INFERIOR: RESUMEN TOTAL A COCINAR */}
      <div className="card" style={{ padding: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Resumen Total a Cocinar (Todos los Años)</h4>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {dynamicDishTotals.length === 0 ? (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay pedidos confirmados aún.</span>
          ) : (
            dynamicDishTotals.map(d => (
              <div 
                key={d.id} 
                style={{ 
                  background: d.pending === 0 ? 'rgba(76, 175, 80, 0.1)' : 'var(--surface-hover)', 
                  border: `1px solid ${d.pending === 0 ? '#4CAF50' : 'var(--border-color)'}`,
                  padding: '0.8rem 1.2rem', 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: '150px'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--primary-color)' }}>{d.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total: <strong>{d.total}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: d.pending > 0 ? '#ff9800' : '#4CAF50', fontWeight: 'bold' }}>
                    {d.pending > 0 ? `Faltan ${d.pending}` : '¡Listos!'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
