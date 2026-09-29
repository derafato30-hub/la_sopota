const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'lasopota-2024'
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const startDate = new Date();
  startDate.setHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);

  const invQuery = query(collection(db, 'invoices'), where('createdAt', '>=', Timestamp.fromDate(startDate)), where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
  const snap = await getDocs(invQuery);
  
  console.log("Found", snap.docs.length, "invoices");
  process.exit(0);
}
check().catch(console.error);
