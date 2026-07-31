import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
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

const createOrders = async () => {
  console.log("Iniciando inyección masiva de 50 pedidos de prueba...");
  
  const orders = [];
  const now = Timestamp.fromDate(new Date());

  // 1. 10 Efectivo, LOCAL, food=100
  for (let i=0; i<10; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'PAGADO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'PARA_LLEVAR', metodoPago: 'EFECTIVO',
      foodTotal: 100, total: 100, deliveryFee: 0,
      createdAt: now, isTest: true
    });
  }

  // 2. 10 Transferencia, LOCAL, food=100 (5 Bac Antony, 5 Banpais)
  for (let i=0; i<10; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'PAGADO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'LOCAL', metodoPago: 'TRANSFERENCIA', banco: i < 5 ? 'Bac Antony' : 'Banpais',
      foodTotal: 100, total: 100, deliveryFee: 0,
      createdAt: now, isTest: true
    });
  }

  // 3. 10 Efectivo, ENVIO_COBRADO (food=100, deliveryFee=50) -> finalTotal=150
  for (let i=0; i<10; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'PAGADO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'ENVIO_COBRADO', metodoPago: 'EFECTIVO',
      foodTotal: 100, total: 150, deliveryFee: 50,
      createdAt: now, isTest: true
    });
  }

  // 4. 10 Transferencia, ENVIO_COBRADO, deliveryPaidByTransfer=true (food=100, deliveryFee=50)
  for (let i=0; i<10; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'PAGADO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'ENVIO_COBRADO', metodoPago: 'TRANSFERENCIA', banco: 'Banpais',
      deliveryPaidByTransfer: true,
      foodTotal: 100, total: 150, deliveryFee: 50,
      createdAt: now, isTest: true
    });
  }

  // 5. 5 Transferencia, ENVIO_COBRADO, deliveryPaidByTransfer=false (food=100, deliveryFee=50) -> total=150 in UI/Invoice but logic checks boolean
  for (let i=0; i<5; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'PAGADO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'ENVIO_COBRADO', metodoPago: 'TRANSFERENCIA', banco: 'Banpais',
      deliveryPaidByTransfer: false,
      foodTotal: 100, total: 150, deliveryFee: 50,
      createdAt: now, isTest: true
    });
  }

  // 6. 3 Credito, LOCAL, food=100
  for (let i=0; i<3; i++) {
    orders.push({
      estado: 'ENTREGADA', estadoPago: 'CREDITO', estadoCocina: 'ENTREGADO', estadoEntrega: 'ENTREGADO',
      orderType: 'LOCAL', metodoPago: 'CREDITO',
      foodTotal: 100, total: 100, deliveryFee: 0,
      createdAt: now, isTest: true
    });
  }

  // 7. 2 Cancelados, LOCAL, food=100
  for (let i=0; i<2; i++) {
    orders.push({
      estado: 'CANCELADA', estadoPago: 'CANCELADO', estadoCocina: 'CANCELADA', estadoEntrega: 'CANCELADO',
      orderType: 'LOCAL', metodoPago: 'EFECTIVO',
      foodTotal: 100, total: 100, deliveryFee: 0,
      createdAt: now, isTest: true
    });
  }

  let count = 0;
  for (const o of orders) {
    await addDoc(collection(db, 'orders'), o);
    count++;
  }
  console.log(`✅ ${count} pedidos inyectados con éxito.`);

  console.log("Inyectando Abonos (Receipts)...");
  await addDoc(collection(db, 'receipts'), { amount: 150, metodoPago: 'EFECTIVO', createdAt: now, isTest: true });
  await addDoc(collection(db, 'receipts'), { amount: 50, metodoPago: 'EFECTIVO', createdAt: now, isTest: true });
  await addDoc(collection(db, 'receipts'), { amount: 100, metodoPago: 'TRANSFERENCIA', paymentBank: 'Ficohsa', createdAt: now, isTest: true });
  console.log(`✅ 3 abonos inyectados.`);

  console.log("Inyectando Gastos (Expenses)...");
  await addDoc(collection(db, 'expenses'), { amount: 50, category: 'Operativo', paymentMethod: 'Efectivo', createdAt: now, isTest: true });
  await addDoc(collection(db, 'expenses'), { amount: 30, category: 'Tercero', paymentMethod: 'Efectivo', createdAt: now, isTest: true });
  console.log(`✅ 2 gastos inyectados.`);

  console.log("\\n=========== RESULTADOS ESPERADOS EN EL DASHBOARD ===========");
  console.log("Venta Total (sin envío): L. 4800");
  console.log("Ventas Efectivo: L. 2000 (1000 local + 1000 envio que se quedó el repartidor)");
  console.log("Ventas Transferencia: L. 3000 (1000 local + 1500 envio pagado completo + 500 envio pagado solo comida)");
  console.log("Crédito Otorgado: L. 300");
  console.log("Abonos Efectivo: L. 200 | Abonos Transf: L. 100");
  console.log("Gastos Operativos: L. 550 (50 manual + 500 del repartidor por las 10 transf de envio completo)");
  console.log("Gastos Terceros: L. 30");
  console.log("------------------------------------------------------------");
  console.log("EFECTIVO ESPERADO EN CAJA: L. 1620 (2000 + 200 - 550 - 30)");
  console.log("TOTAL DEPÓSITOS (Bancos): L. 3100 (3000 + 100)");
  console.log("  - Bac Antony: L. 500");
  console.log("  - Banpais: L. 2500");
  console.log("  - Ficohsa: L. 100");
  console.log("============================================================\\n");
  
  process.exit(0);
};

createOrders().catch(console.error);
