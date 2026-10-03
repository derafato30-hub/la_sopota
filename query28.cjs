const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDqYBCXfTSur3FsdYwp5Vv-T1OKuR30wkk",
  authDomain: "adminlasopota.firebaseapp.com",
  projectId: "adminlasopota",
  storageBucket: "adminlasopota.firebasestorage.app",
  messagingSenderId: "620555206446",
  appId: "1:620555206446:web:ae00f1acae5a8de56544bf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const start = new Date('2026-09-28T00:00:00.000-06:00');
  const end = new Date('2026-09-28T23:59:59.999-06:00');

  const q = query(
    collection(db, 'orders'),
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end))
  );

  const snap = await getDocs(q);
  console.log("Total orders found:", snap.size);

  let totals = {};
  let globalTotal = 0;

  snap.forEach(doc => {
    const data = doc.data();
    const pm = data.paymentMethod || 'desconocido';
    const total = data.total || 0;
    
    if (!totals[pm]) totals[pm] = 0;
    totals[pm] += total;
    globalTotal += total;
  });

  console.log("----------------------");
  console.log("RESUMEN DEL LUNES 28 SEPT 2026");
  for (const [method, amount] of Object.entries(totals)) {
    console.log("- " + method.toUpperCase() + ": L. " + amount.toFixed(2));
  }
  console.log("----------------------");
  console.log("TOTAL GENERAL: L. " + globalTotal.toFixed(2));
}

run().catch(console.error).then(() => process.exit(0));
