const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /<div className="pos-container" style=\{\{flex: 1, overflow: 'hidden'\}\}>/,
  `<div className="pos-container" style={{flex: 1, overflow: 'hidden'}}>
     <button style={{position: 'absolute', top: '10px', left: '50%', zIndex: 9999, background: 'red', color: 'white', padding: '10px'}} onClick={async () => {
       try {
         const { doc, getDoc, updateDoc } = await import('firebase/firestore');
         const invoiceRef = doc(db, 'invoices', 'FAC-0569');
         const iSnap = await getDoc(invoiceRef);
         if(!iSnap.exists()) return alert('No se encontró la FAC-0569');
         const orderId = iSnap.data().orderId;
         const oRef = doc(db, 'orders', orderId);
         const payments = [{method: 'EFECTIVO', amount: 200, isAuto: false}, {method: 'TRANSFERENCIA', bank: 'Bac Antony', amount: 280, isAuto: false}];
         await updateDoc(invoiceRef, {metodoPago: 'MULTIPLE', banco: null, pagosMultiples: payments});
         await updateDoc(oRef, {metodoPago: 'MULTIPLE', banco: null, pagosMultiples: payments});
         alert('¡Corregido FAC-0569 exitosamente! Refresca la página y revisa los gastos.');
       } catch (e) {
         alert('Error: ' + e.message);
       }
     }}>🚨 CORREGIR FAC-0569 🚨</button>`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Injected fix button');
