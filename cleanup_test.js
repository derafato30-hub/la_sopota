import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const envConfig = fs.readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    acc[key.trim()] = val.join('=').trim().replace(/(^'|'$|^"|"$)/g, '');
    return acc;
  }, {});

const firebaseConfig = {
  apiKey: envConfig['VITE_FIREBASE_API_KEY'],
  authDomain: envConfig['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: envConfig['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: envConfig['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: envConfig['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: envConfig['VITE_FIREBASE_APP_ID']
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cleanupTests = async () => {
  console.log("Iniciando limpieza de datos de prueba...");
  
  const collectionsToClean = ['orders', 'receipts', 'expenses'];
  let totalDeleted = 0;

  for (const coll of collectionsToClean) {
    const q = query(collection(db, coll), where('isTest', '==', true));
    const snap = await getDocs(q);
    
    for (const doc of snap.docs) {
      await deleteDoc(doc.ref);
      totalDeleted++;
    }
  }

  console.log(`✅ Limpieza completada. Se eliminaron ${totalDeleted} documentos de prueba.`);
  process.exit(0);
};

cleanupTests().catch(console.error);
