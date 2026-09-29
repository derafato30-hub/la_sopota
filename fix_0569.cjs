const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

async function fixPayment() {
  const invoiceId = 'FAC-0569';
  const invoiceRef = doc(db, 'invoices', invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  
  if (!invoiceSnap.exists()) {
    console.error('Invoice not found!');
    process.exit(1);
  }
  
  const invoiceData = invoiceSnap.data();
  console.log('Found invoice. Original data:', { 
    total: invoiceData.total, 
    metodoPago: invoiceData.metodoPago,
    pagosMultiples: invoiceData.pagosMultiples
  });
  
  const orderId = invoiceData.orderId;
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  const newPayments = [
    { method: 'EFECTIVO', amount: 200, isAuto: false },
    { method: 'TRANSFERENCIA', bank: 'Bac Antony', amount: 280, isAuto: false }
  ];
  
  // Update invoice
  await updateDoc(invoiceRef, {
    metodoPago: 'MULTIPLE',
    banco: null, // multiple doesn't have a single primary bank usually
    pagosMultiples: newPayments
  });
  console.log('Invoice updated.');
  
  // Update order
  if (orderSnap.exists()) {
    await updateDoc(orderRef, {
      metodoPago: 'MULTIPLE',
      banco: null,
      pagosMultiples: newPayments
    });
    console.log('Order updated.');
  } else {
    console.log('Order not found!');
  }
}

fixPayment().then(() => {
  console.log('Done fixing payments!');
  process.exit(0);
}).catch(console.error);
