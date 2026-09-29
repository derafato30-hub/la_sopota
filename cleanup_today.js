import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get Honduras local date string
const date = new Date();
const offset = -6 * 60; // Honduras is UTC-6
const localDate = new Date(date.getTime() + (offset + date.getTimezoneOffset()) * 60000);
const todayStr = localDate.toISOString().split('T')[0];

console.log('Today is', todayStr);

async function deleteTodayData() {
  const collections = ['orders', 'invoices', 'expenses'];
  
  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    let deletedCount = 0;
    
    for (const d of snap.docs) {
      const data = d.data();
      let shouldDelete = false;
      
      if (data.createdAt) {
        const dTime = new Date(data.createdAt.seconds * 1000);
        const dLocal = new Date(dTime.getTime() + (offset + dTime.getTimezoneOffset()) * 60000);
        if (dLocal.toISOString().split('T')[0] === todayStr) {
          shouldDelete = true;
        }
      } else if (data.date === todayStr) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        await deleteDoc(doc(db, col, d.id));
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} documents from ${col} for today (${todayStr})`);
  }
}

deleteTodayData().then(() => {
  console.log('Cleanup complete');
  process.exit(0);
}).catch(console.error);
