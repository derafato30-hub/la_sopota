const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Ensure runTransaction is imported
if (!f.includes('runTransaction')) {
  f = f.replace(/import \{.*?\} from 'firebase\/firestore';/, (match) => {
    return match.replace('}', ', runTransaction, query, collection, getDocs }');
  });
}

// Find where invoice is created and orders are updated
const targetStr = `await updateDoc(doc(db, 'orders', paymentModalOrder.id), updateData);`;

const newStr = `
        await updateDoc(doc(db, 'orders', paymentModalOrder.id), updateData);
        
        // --- INICIO INTEGRACION CON FINANZAS (LEDGER) ---
        // Extraemos solo los pagos reales que ingresan dinero (no cortesias ni creditos)
        const pagosAProcesar = effectiveSplitPayments.filter(p => 
          p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA'
        );

        if (pagosAProcesar.length > 0) {
          // Obtenemos todas las cuentas una sola vez para mapear nombres a IDs
          const accSnap = await getDocs(collection(db, 'fin_accounts'));
          const finAccounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          for (const payment of pagosAProcesar) {
            let targetAccountId = null;

            if (payment.method === 'EFECTIVO') {
              const cashAcc = finAccounts.find(a => a.type === 'CASH');
              targetAccountId = cashAcc ? cashAcc.id : 'efectivo_caja';
            } else if (payment.method === 'TRANSFERENCIA' && payment.bank) {
              const normalizedBank = payment.bank.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
              const matchedAcc = finAccounts.find(a => 
                a.name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes(normalizedBank)
              );
              if (matchedAcc) {
                targetAccountId = matchedAcc.id;
              } else {
                console.warn('No se encontr la cuenta financiera para:', payment.bank);
                // Fallback attempt (create a generic slug)
                targetAccountId = payment.bank.toLowerCase().replace(/\\s+/g, '_');
              }
            }

            if (targetAccountId) {
               // Envolver en runTransaction para partida doble
               await runTransaction(db, async (t) => {
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
               });
            }
          }
        }
        // --- FIN INTEGRACION CON FINANZAS ---
`;

if (!f.includes('INICIO INTEGRACION CON FINANZAS')) {
  f = f.replace(targetStr, newStr);
  fs.writeFileSync('src/pages/POS.jsx', f, 'utf8');
  console.log("Patched POS.jsx for Finanzas Ledger Integration.");
} else {
  console.log("Already patched.");
}
