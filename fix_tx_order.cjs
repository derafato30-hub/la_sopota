const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

const badTx = `               await runTransaction(db, async (t) => {
                 const txRef = doc(collection(db, 'fin_transactions'));
                 t.set(txRef, {
                   amount: payment.amount,
                   type: 'IN',
                   category: 'VENTA_POS',
                   description: \`Cobro Venta POS - Fac: \${invoiceId}\`,
                   sourceAccountId: null,
                   destinationAccountId: targetAccountId,
                   date: serverTimestamp(),
                   createdBy: currentUser.uid,
                   metadata: { orderId: paymentModalOrder.id, invoiceId: invoiceId }
                 });

                 const accRef = doc(db, 'fin_accounts', targetAccountId);
                 const accDoc = await t.get(accRef);
                 if (accDoc.exists()) {
                   t.update(accRef, { balance: (accDoc.data().balance || 0) + payment.amount });
                 }
               });`;

const goodTx = `               await runTransaction(db, async (t) => {
                 const accRef = doc(db, 'fin_accounts', targetAccountId);
                 const accDoc = await t.get(accRef); // SIEMPRE LEER ANTES DE ESCRIBIR EN FIRESTORE TRANSACTIONS
                 
                 const txRef = doc(collection(db, 'fin_transactions'));
                 t.set(txRef, {
                   amount: payment.amount,
                   type: 'IN',
                   category: 'VENTA_POS',
                   description: \`Cobro Venta POS - Fac: \${invoiceId}\`,
                   sourceAccountId: null,
                   destinationAccountId: targetAccountId,
                   date: serverTimestamp(),
                   createdBy: currentUser.uid,
                   metadata: { orderId: paymentModalOrder.id, invoiceId: invoiceId }
                 });

                 if (accDoc.exists()) {
                   t.update(accRef, { balance: (accDoc.data().balance || 0) + payment.amount });
                 }
               });`;

f = f.replace(badTx, goodTx);

fs.writeFileSync('src/pages/POS.jsx', f, 'utf8');
console.log('Fixed Firestore read-after-write transaction error.');
