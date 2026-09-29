const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, Timestamp } = require('firebase/firestore');

const firebaseConfig = { projectId: 'lasopota-2024' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const startDate = new Date();
  startDate.setHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);

  const invQuery = query(collection(db, 'invoices'), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
  const snap = await getDocs(invQuery);
  
  let g_efectivo = 0;
  let g_transfer = 0;
  
  let f_cash = 0;

  snap.forEach(d => {
    const inv = d.data();
    if (inv.estado === 'ANULADA' || inv.estado === 'CANCELADA') return;
    
    // Simulate Finanzas
    let f_val = 0;
    if (inv.metodoPago !== 'CREDITO' && inv.metodoPago !== 'MULTIPLE' && inv.metodoPago !== 'CONSUMO_PROPIO' && inv.metodoPago !== 'CORTESIA') {
      f_val = inv.total || 0;
    } else if (inv.metodoPago === 'MULTIPLE' && inv.pagosMultiples) {
      let totalAdded = 0;
      inv.pagosMultiples.forEach(p => totalAdded += p.amount);
      let vuelto = Math.max(0, totalAdded - (inv.total || 0));
      let collected = 0;
      inv.pagosMultiples.forEach(p => {
        if (p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA') collected += p.amount;
      });
      f_val = Math.max(0, collected - vuelto);
    }
    f_cash += f_val;
    
    console.log(inv.id, 'Total:', inv.total, 'Method:', inv.metodoPago, 'F_VAL:', f_val);
  });
  
  console.log("Total Finanzas Calc:", f_cash);
  process.exit(0);
}
run();
