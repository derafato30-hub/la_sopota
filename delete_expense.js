import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
  const snapshot = await getDocs(collection(db, 'expenses'));
  const matches = [];
  snapshot.forEach(d => {
    const data = d.data();
    if (data.reason && data.reason.includes('fac0173')) {
      matches.push({ id: d.id, ...data });
    }
  });
  
  console.log("Found:", matches.length, "expenses for fac0173");
  matches.forEach(m => console.log(m.id, m.reason, m.createdAt));
  if (matches.length > 1) {
    // Delete the first one
    const toDelete = matches[0];
    console.log("Deleting:", toDelete.id);
    await deleteDoc(doc(db, 'expenses', toDelete.id));
    console.log("Deleted successfully.");
  } else {
    console.log("No duplicates found.");
  }
}

run();
