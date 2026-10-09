const fs = require('fs');
const path = 'src/pages/POS.jsx';
let f = fs.readFileSync(path, 'utf8');

const targetStr = `        // 3. Reverse Credit if applicable
        if (order.estadoPago === 'CREDITO' && order.clienteId !== 'generico') {`;

const insertion = `        // 4. Reverse Finanzas Ledger if it was already paid
        if (order.estadoPago !== 'PENDIENTE' && order.estadoPago !== 'CANCELADO') {
           const oldPayments = order.pagosMultiples || [];
           const pagosReales = oldPayments.filter(p => p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA');
           
           if (pagosReales.length > 0) {
             const accSnap = await getDocs(collection(db, 'fin_accounts'));
             const finAccounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() }));

             const getAccountId = (method, bank) => {
               if (method === 'EFECTIVO') return finAccounts.find(a => a.type === 'CASH')?.id || 'efectivo_caja';
               if (method === 'TRANSFERENCIA' && bank) {
                 const normalizedBank = bank.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
                 return finAccounts.find(a => a.name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes(normalizedBank))?.id || bank.toLowerCase().replace(/\\s+/g, '_');
               }
               return null;
             };

             for (const oldP of pagosReales) {
               const targetAccountId = getAccountId(oldP.method, oldP.bank);
               if (targetAccountId) {
                 await runTransaction(db, async (t) => {
                   const accRef = doc(db, 'fin_accounts', targetAccountId);
                   const accDoc = await t.get(accRef);
                   
                   const txRef = doc(collection(db, 'fin_transactions'));
                   t.set(txRef, {
                     amount: oldP.amount,
                     type: 'OUT',
                     category: 'DEVOLUCION_POS',
                     description: \`REEMBOLSO por Cancelación - Fac: \${order.invoiceId || 'N/A'}\`,
                     sourceAccountId: targetAccountId,
                     destinationAccountId: null,
                     date: serverTimestamp(),
                     createdBy: currentUser.uid,
                     metadata: { orderId: order.id, invoiceId: order.invoiceId, isRefund: true }
                   });

                   if (accDoc.exists()) {
                     t.update(accRef, { balance: (accDoc.data().balance || 0) - oldP.amount });
                   }
                 });
               }
             }
           }
        }

        // 3. Reverse Credit if applicable
        if (order.estadoPago === 'CREDITO' && order.clienteId !== 'generico') {`;

f = f.replace(targetStr, insertion);

fs.writeFileSync(path, f, 'utf8');
console.log("Successfully injected refund logic into handleCancelOrder.");
