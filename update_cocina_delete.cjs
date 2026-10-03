const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');

// Add delete functions
const fns = `
  const handleDeleteOrder = async (orderId) => {
    if (!confirm("¿Eliminar este pedido?")) return;
    try {
      import('firebase/firestore').then(({ deleteDoc, doc }) => {
        deleteDoc(doc(db, 'clubOrders', orderId));
        toast.success("Pedido eliminado");
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
  };

  const handleClearTest = async () => {
    if (!confirm("¿ESTÁS SEGURO? Esto eliminará TODOS los pedidos que están PENDIENTES. Usar solo para limpiar pruebas.")) return;
    const pending = orders.filter(o => o.status === 'PENDING');
    if (pending.length === 0) return toast.info("No hay pedidos pendientes para borrar");
    
    try {
      import('firebase/firestore').then(({ deleteDoc, doc }) => {
        pending.forEach(p => {
          deleteDoc(doc(db, 'clubOrders', p.id));
        });
        toast.success(pending.length + " pedidos de prueba eliminados");
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al limpiar");
    }
  };

  const handleToggleStatus = async (order) => {`;

f = f.replace("const handleToggleStatus = async (order) => {", fns);

// Add trash icon import
f = f.replace("import { Search, Printer } from 'lucide-react';", "import { Search, Printer, Trash2, AlertOctagon } from 'lucide-react';");

// Add clear button to top bar
const printBtn = `<button className="btn-secondary" onClick={handlePrint} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Printer size={18} />
          Imprimir Listas
        </button>`;

const newBtns = `<button className="btn-secondary" onClick={handlePrint} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Printer size={18} />
          Imprimir
        </button>
        <button onClick={handleClearTest} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'transparent', border: '1px solid #f44336', color: '#f44336', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
          <AlertOctagon size={18} />
          Limpiar Pruebas
        </button>`;

f = f.replace(printBtn, newBtns);

// Add trash icon to individual orders
const orderDiv = `<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.cadetName}
                        </span>
                        {selectedDishId === 'ALL' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.dishName}
                          </span>
                        )}
                      </div>`;

const newOrderDiv = `<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.cadetName}
                        </span>
                        {selectedDishId === 'ALL' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.dishName}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteOrder(order.id)} style={{ background: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={16} />
                      </button>`;

f = f.replace(new RegExp(orderDiv.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'g'), newOrderDiv);

fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("CocinaTab updated with delete functions");
