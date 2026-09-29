const fs = require('fs');
const env = fs.readFileSync('.env.development', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const date = new Date();
const offset = -6 * 60; 
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
