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
  const start = new Date('2026-09-28T00:00:00.000-06:00'); // Lunes
  const end = new Date('2026-09-30T23:59:59.999-06:00');

  const q = query(
    collection(db, 'receipts'),
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(end))
  );

  const snap = await getDocs(q);
  console.log("Total abonos found:", snap.size);

  let totalAbonos = 0;
  snap.forEach(doc => {
    totalAbonos += doc.data().amount || 0;
  });

  console.log("Total Abonos sum: " + totalAbonos);
}

run().catch(console.error).then(() => process.exit(0));
