const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } = require('firebase/firestore');

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

async function clearCollection(colName) {
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  let count = 0;
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, colName, document.id));
    count++;
  }
  console.log(`Deleted ${count} documents from ${colName}`);
}

async function run() {
  console.log("Limpiando datos de prueba...");
  await clearCollection('orders');
  await clearCollection('invoices');
  await clearCollection('receipts');
  await clearCollection('expenses');
  await clearCollection('dailyClosings');
  
  // Reseteamos el balance de los clientes a 0
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientsCount = 0;
  for (const document of clientsSnap.docs) {
    await updateDoc(doc(db, 'clients', document.id), { creditBalance: 0 });
    clientsCount++;
  }
  console.log(`Reset credit balance for ${clientsCount} clients`);
  console.log("¡Limpieza completada!");
  process.exit(0);
}

run().catch(console.error);
