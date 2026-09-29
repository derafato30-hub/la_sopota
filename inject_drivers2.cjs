const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /const custSnap = await getDocs\(collection\(db, 'clients'\)\);\s*setCustomers\(custSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/,
  `const custSnap = await getDocs(collection(db, 'clients'));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const driverSnap = await getDocs(collection(db, 'drivers'));
      setDrivers(driverSnap.docs.map(d => ({ id: d.id, ...d.data() })));`
);

code = code.replace(
  /await updateDoc\(doc\(db, 'orders', dispatchOrder\.id\), \{\s*estadoEntrega: 'ENTREGADO',\s*driverName,\s*driverPhone,\s*driverPaidFromRegister: \(dispatchOrder\.deliveryFee > 0 && payDriverFromRegister\)\s*\}\);/,
  `await updateDoc(doc(db, 'orders', dispatchOrder.id), {
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
                }`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Fixed fetch and save replacements');
