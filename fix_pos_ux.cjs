const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// 1. Add onSnapshot to imports
f = f.replace(/import \{ collection, getDocs/, "import { collection, getDocs, onSnapshot, query, orderBy, limit");

// 2. Replace loadOrders with real-time listener inside useEffect
// First, find the fetchData / loadOrders useEffect
f = f.replace(/useEffect\(\(\) => \{\r?\n\s*fetchData\(\);\r?\n\s*loadOrders\(\);\r?\n\s*\}, \[\]\);/g, 
`useEffect(() => {
    fetchData();
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(300));
    const unsub = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveOrders(data.filter(o => {
        const isSettled = o.estadoEntrega === 'ENTREGADO' && (o.estadoPago === 'PAGADO' || o.estadoPago === 'CREDITO' || o.estadoPago === 'CONSUMO_PROPIO');
        if (!isSettled) return true;
        if (o.createdAt?.toDate) return o.createdAt.toDate().getTime() >= hoy.getTime();
        return false;
      }));
      
      const sold = {};
      const soldC = {};
      data.forEach(o => {
        if (o.createdAt?.toDate && o.createdAt.toDate().getTime() >= hoy.getTime() && o.estadoCocina !== 'BORRADOR') {
          (o.items || []).forEach(item => {
            if (item.type === 'sopa' || item.name.toLowerCase().includes('sopa')) sold[item.id] = (sold[item.id] || 0) + item.qty;
            if (item.type === 'menu_dia' && item.carneId) {
              const qtyMedios = item.dmSize === 'COMPLETO' ? (item.qty * 1.5) : (item.qty * 1);
              soldC[item.carneId] = (soldC[item.carneId] || 0) + qtyMedios;
            }
          });
        }
      });
      setSoldSoups(sold);
      setSoldCarnes(soldC);
    });
    return () => unsub();
  }, []);`);

// 3. Stub loadOrders so we don't break existing calls scattered around
f = f.replace(/const loadOrders = async \(\) => \{[\s\S]*?setSoldCarnes\(soldC\);\r?\n\s*\} catch\(e\) \{ console\.error\(e\); \}\r?\n\s*\};/, 'const loadOrders = async () => { /* Now using onSnapshot realtime */ };');

// 4. Add "X" to showCheckoutModal
f = f.replace(/<h2 style=\{\{borderBottom: '2px solid var\(--accent-color\)', paddingBottom: '0\.5rem', marginBottom: '1\.5rem'\}\}>\r?\n\s*✅ Checkout de la Orden\r?\n\s*<\/h2>/, 
`<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--accent-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin: 0}}>✅ Checkout de la Orden</h2>
                <button className="icon-btn" onClick={() => setShowCheckoutModal(false)}>❌</button>
              </div>`);

// 5. Hide Borradores column if empty
f = f.replace(/\{\/\* COLUMNA 1: Borradores \*\/\}\r?\n\s*<div className="kanban-col card"/, 
`{/* COLUMNA 1: Borradores */}
          {activeOrders.filter(o => o.estadoCocina === 'BORRADOR').length > 0 && (
          <div className="kanban-col card"`);
// Close the conditional for Borradores column
f = f.replace(/No hay borradores\.<\/p>\}\r?\n\s*<\/div>\r?\n\s*<\/div>/, 
`No hay borradores.</p>}
            </div>
          </div>
          )}`);

// 6. When moving to UnpaidWarningModal or PaymentModal, ensure it fetches the fresh order from activeOrders if possible, or just the stale one is fine as long as we patch driverPaidFromRegister.
// In `setUnpaidWarningOrder(dispatchOrder)`, we just updated `dispatchOrder` in DB. Let's mutate the local object before passing it!
f = f.replace(/await logAuditAction\('DESPACHAR_ORDEN'[\s\S]*?if \(dispatchOrder\.estadoPago === 'PENDIENTE'\) \{/, 
`await logAuditAction('DESPACHAR_ORDEN', 'POS', \`Orden despachada. Repartidor: \${driverName || 'No especificado'}\`, currentUser);
                  setShowDispatchModal(false);
                  
                  // Update local object so the modal sees the fresh driverPaidFromRegister flag
                  const freshOrder = { ...dispatchOrder, driverPaidFromRegister: (dispatchOrder.deliveryFee > 0 && payDriverFromRegister) };

                  if (dispatchOrder.estadoPago === 'PENDIENTE') {
                    setUnpaidWarningOrder(freshOrder);`);

fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Fixed POS UX issues');
