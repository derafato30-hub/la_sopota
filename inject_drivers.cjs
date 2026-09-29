const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// Fetch drivers near clients (around line 410)
const fetchClientsCall = `const custSnap = await getDocs(collection(db, 'clients'));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));`;
const fetchDriversAdd = `const custSnap = await getDocs(collection(db, 'clients'));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const driverSnap = await getDocs(collection(db, 'drivers'));
      setDrivers(driverSnap.docs.map(d => ({ id: d.id, ...d.data() })));`;

if (!code.includes('const driverSnap = await getDocs(collection(db, \'drivers\'));')) {
  code = code.replace(fetchClientsCall, fetchDriversAdd);
}

// Add saving logic after updateDoc
const orderUpdateCall = `await updateDoc(doc(db, 'orders', dispatchOrder.id), {
                  estadoEntrega: 'ENTREGADO',
                  driverName,
                  driverPhone,
                  driverPaidFromRegister: (dispatchOrder.deliveryFee > 0 && payDriverFromRegister)
                });`;
const saveDriverAdd = `await updateDoc(doc(db, 'orders', dispatchOrder.id), {
                  estadoEntrega: 'ENTREGADO',
                  driverName,
                  driverPhone,
                  driverPaidFromRegister: (dispatchOrder.deliveryFee > 0 && payDriverFromRegister)
                });
                
                if (driverName.trim()) {
                  await setDoc(doc(db, 'drivers', driverName.trim().toLowerCase().replace(/\\s+/g, '_')), {
                    name: driverName.trim(),
                    phone: driverPhone.trim()
                  });
                }`;

if (!code.includes('doc(db, \'drivers\'')) {
  code = code.replace(orderUpdateCall, saveDriverAdd);
}

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Injected fetch and save');
