const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Add the state variable
if (!f.includes('const [isPaymentCorrection, setIsPaymentCorrection]')) {
  f = f.replace(
    /const \[paymentModalOrder, setPaymentModalOrder\] = useState\(null\);/,
    `const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [isPaymentCorrection, setIsPaymentCorrection] = useState(false);`
  );
}

// Update the "Cobrar" buttons for super user
const replaceCardButton = `
                    {o.estadoPago === 'PENDIENTE' ? (
                      <button className="btn-primary" style={{backgroundColor: '#FF9800', color: 'white'}} onClick={() => { setIsPaymentCorrection(false); setPaymentMethod('EFECTIVO'); setAmountReceived(''); setSplitPayments(o.pagosMultiples || o.splitPayments || []); setCurrentPaymentAmount(''); setModalDeliveryFee(o.deliveryFee || 0); setIncludeDeliveryInInvoice(o.includeDeliveryInInvoice ?? true); setDeliveryPaidByTransfer(o.deliveryPaidByTransfer || false); setPaymentModalOrder(o); }}>Cobrar</button>
                    ) : (
                      <>
      <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
      <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #2196F3', color: 'var(--text-color)'}} onClick={() => handleEditOrder(o)}>✏️ Editar Orden</button>
      {(hasPermission && hasPermission('SUPERUSUARIO')) && (
        <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #FF5722', color: '#FF5722'}} onClick={() => { setIsPaymentCorrection(true); setPaymentMethod('EFECTIVO'); setAmountReceived(''); setSplitPayments(o.pagosMultiples || o.splitPayments || []); setCurrentPaymentAmount(''); setModalDeliveryFee(o.deliveryFee || 0); setIncludeDeliveryInInvoice(o.includeDeliveryInInvoice ?? true); setDeliveryPaidByTransfer(o.deliveryPaidByTransfer || false); setPaymentModalOrder(o); }}>⚠️ Editar Pago</button>
      )}
    </>
                    )}
`;

// It's safer to use regex to inject the super user button
f = f.replace(/\{o\.estadoPago === 'PENDIENTE' \? \([\s\S]*?\} \)\}/g, (match) => {
  return match; // We'll do it more precisely below
});

// Since the file has multiple instances of "Imprimir Factura", we will just replace all instances of:
// onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
// with the button + the new super user button
const printBtn = `<button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>`;
const printBtnWithEdit = `${printBtn}
      {hasPermission('SUPERUSUARIO') && o.estadoPago !== 'PENDIENTE' && (
        <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #FF5722', color: '#FF5722', marginTop: '0.25rem'}} onClick={() => { setIsPaymentCorrection(true); setPaymentMethod('EFECTIVO'); setAmountReceived(''); setSplitPayments(o.pagosMultiples || o.splitPayments || []); setCurrentPaymentAmount(''); setModalDeliveryFee(o.deliveryFee || 0); setIncludeDeliveryInInvoice(o.includeDeliveryInInvoice ?? true); setDeliveryPaidByTransfer(o.deliveryPaidByTransfer || false); setPaymentModalOrder(o); }}>⚠️ Editar Pago</button>
      )}`;
      
f = f.split(printBtn).join(printBtnWithEdit);

// Update setPaymentModalOrder(o) to also reset isPaymentCorrection if it's the normal Cobrar button
f = f.replace(/setPaymentModalOrder\(o\); \}\}>Cobrar/g, "setIsPaymentCorrection(false); setPaymentModalOrder(o); }}>Cobrar");
f = f.replace(/setPaymentModalOrder\(o\); \}\}>Cobrar Ahora/g, "setIsPaymentCorrection(false); setPaymentModalOrder(o); }}>Cobrar Ahora");

// Now update handleConfirmPayment
// We need to inject the correction logic
const oldHandleStart = `  const handleConfirmPayment = async (overrideSplitPayments = null) => {
    if (!paymentModalOrder) return;
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    const hasDelivery = paymentModalOrder.orderType === 'ENVIO_COBRADO';
    const finalTotal = paymentModalOrder.total + (hasDelivery ? modalDeliveryFee : 0);
    
    let effectiveSplitPayments = overrideSplitPayments || [...splitPayments];

    const totalAdded = effectiveSplitPayments.reduce((acc, p) => acc + p.amount, 0);

    const isConsumo = effectiveSplitPayments.some(p => p.method === 'CONSUMO_PROPIO');
    const hasCredit = effectiveSplitPayments.some(p => p.method === 'CREDITO');
    
    const realPayments = effectiveSplitPayments.filter(p => p.method !== 'PAGO_REPARTIDOR');
    const primaryMethod = realPayments.length === 1 ? realPayments[0].method : (realPayments.length > 1 ? 'MULTIPLE' : 'EFECTIVO');
    const primaryBank = realPayments.length === 1 ? realPayments[0].bank : null;
    
    let estadoBase = 'PAGADA';
    if (isConsumo) estadoBase = 'CORTESÍA';
    if (hasCredit) estadoBase = 'CRÉDITO';

    try {
      const metaRef = doc(db, 'metadata', 'invoices');
      const metaSnap = await getDoc(metaRef);
      let nextNum = 1;
      if (metaSnap.exists()) {
        nextNum = metaSnap.data().lastCorrelative + 1;
      }
      const invoiceId = \`FAC-\${String(nextNum).padStart(4, '0')}\`;`;

const newHandleStart = `  const handleConfirmPayment = async (overrideSplitPayments = null) => {
    if (!paymentModalOrder) return;
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    const hasDelivery = paymentModalOrder.orderType === 'ENVIO_COBRADO';
    const finalTotal = paymentModalOrder.total + (hasDelivery ? modalDeliveryFee : 0);
    
    let effectiveSplitPayments = overrideSplitPayments || [...splitPayments];

    const totalAdded = effectiveSplitPayments.reduce((acc, p) => acc + p.amount, 0);

    const isConsumo = effectiveSplitPayments.some(p => p.method === 'CONSUMO_PROPIO');
    const hasCredit = effectiveSplitPayments.some(p => p.method === 'CREDITO');
    
    const realPayments = effectiveSplitPayments.filter(p => p.method !== 'PAGO_REPARTIDOR');
    const primaryMethod = realPayments.length === 1 ? realPayments[0].method : (realPayments.length > 1 ? 'MULTIPLE' : 'EFECTIVO');
    const primaryBank = realPayments.length === 1 ? realPayments[0].bank : null;
    
    let estadoBase = 'PAGADA';
    if (isConsumo) estadoBase = 'CORTESÍA';
    if (hasCredit) estadoBase = 'CRÉDITO';

    try {
      let invoiceId = paymentModalOrder.invoiceId;
      const metaRef = doc(db, 'metadata', 'invoices');
      
      if (!isPaymentCorrection) {
        const metaSnap = await getDoc(metaRef);
        let nextNum = 1;
        if (metaSnap.exists()) {
          nextNum = metaSnap.data().lastCorrelative + 1;
        }
        invoiceId = \`FAC-\${String(nextNum).padStart(4, '0')}\`;
      }`;

f = f.replace(oldHandleStart, newHandleStart);

// Now update the saving of the invoice and the financial integration
const oldInvoiceSave = `      const cust = customers.find(c => c.id === paymentModalOrder.clienteId);

      const newInvoice = {
        id: invoiceId, 
        orderId: paymentModalOrder.id,
        clienteId: paymentModalOrder.clienteId,
        clientName: cust?.razonSocial || paymentModalOrder.clientName,
        rtn: cust?.rtn || null,
        razonSocial: cust?.razonSocial || null,
        total: finalTotal,
        foodTotal: paymentModalOrder.total,
        deliveryFee: hasDelivery ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        items: paymentModalOrder.items,
        metodoPago: primaryMethod,
        banco: primaryBank,
        pagosMultiples: effectiveSplitPayments,
        estado: estadoBase,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        saldoPendiente: hasCredit ? (effectiveSplitPayments.filter(p => p.method === 'CREDITO').reduce((acc, p) => acc + p.amount, 0)) : 0
      };
      
      await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
      await setDoc(metaRef, { lastCorrelative: nextNum });`;

const newInvoiceSave = `      const cust = customers.find(c => c.id === paymentModalOrder.clienteId);

      const newInvoice = {
        id: invoiceId, 
        orderId: paymentModalOrder.id,
        clienteId: paymentModalOrder.clienteId,
        clientName: cust?.razonSocial || paymentModalOrder.clientName,
        rtn: cust?.rtn || null,
        razonSocial: cust?.razonSocial || null,
        total: finalTotal,
        foodTotal: paymentModalOrder.total,
        deliveryFee: hasDelivery ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        items: paymentModalOrder.items,
        metodoPago: primaryMethod,
        banco: primaryBank,
        pagosMultiples: effectiveSplitPayments,
        estado: estadoBase,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        saldoPendiente: hasCredit ? (effectiveSplitPayments.filter(p => p.method === 'CREDITO').reduce((acc, p) => acc + p.amount, 0)) : 0
      };
      
      if (isPaymentCorrection) {
        await updateDoc(doc(db, 'invoices', invoiceId), {
          metodoPago: primaryMethod,
          banco: primaryBank,
          pagosMultiples: effectiveSplitPayments,
          estado: estadoBase,
          isCorrected: true
        });
      } else {
        await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
        // Using setDoc for metadata but it might be better with updateDoc. Assuming setDoc with merge is fine, but let's just do updateDoc
        await updateDoc(metaRef, { lastCorrelative: Number(invoiceId.split('-')[1]) });
      }`;

f = f.replace(oldInvoiceSave, newInvoiceSave);

// Now for the Financial integration. We need to handle Reversal!
const oldFin = `      // --- INICIO INTEGRACION CON FINANZAS (LEDGER) ---
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
              console.warn('No se encontró la cuenta financiera para:', payment.bank);
              // Fallback attempt (create a generic slug)
              targetAccountId = payment.bank.toLowerCase().replace(/\\s+/g, '_');
            }
          }

          if (targetAccountId) {
             // Envolver en runTransaction para partida doble
             await runTransaction(db, async (t) => {
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
             });
          }
        }
      }
      // --- FIN INTEGRACION CON FINANZAS ---`;

const newFin = `      // --- INICIO INTEGRACION CON FINANZAS (LEDGER) ---
      // Obtenemos todas las cuentas una sola vez para mapear nombres a IDs
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

      if (isPaymentCorrection) {
         // Lógica Append-Only: Revertir los pagos anteriores de esta orden
         const oldPayments = paymentModalOrder.pagosMultiples || [];
         const oldPagosAProcesar = oldPayments.filter(p => p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA');
         
         for (const oldP of oldPagosAProcesar) {
           const targetAccountId = getAccountId(oldP.method, oldP.bank);
           if (targetAccountId) {
             await runTransaction(db, async (t) => {
               const accRef = doc(db, 'fin_accounts', targetAccountId);
               const accDoc = await t.get(accRef);
               
               const txRef = doc(collection(db, 'fin_transactions'));
               t.set(txRef, {
                 amount: oldP.amount,
                 type: 'OUT',
                 category: 'AJUSTE_NEGATIVO',
                 description: \`REVERSIÓN (Edición de Pago) - Fac: \${invoiceId}\`,
                 sourceAccountId: targetAccountId,
                 destinationAccountId: null,
                 date: serverTimestamp(),
                 createdBy: currentUser.uid,
                 metadata: { orderId: paymentModalOrder.id, invoiceId: invoiceId, isReversal: true }
               });

               if (accDoc.exists()) {
                 t.update(accRef, { balance: (accDoc.data().balance || 0) - oldP.amount });
               }
             });
           }
         }
      }

      // Procesar los nuevos pagos (o pagos actuales si no es correccion)
      const pagosAProcesar = effectiveSplitPayments.filter(p => p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA');
      for (const payment of pagosAProcesar) {
        const targetAccountId = getAccountId(payment.method, payment.bank);
        if (targetAccountId) {
           await runTransaction(db, async (t) => {
             const accRef = doc(db, 'fin_accounts', targetAccountId);
             const accDoc = await t.get(accRef);
             
             const txRef = doc(collection(db, 'fin_transactions'));
             t.set(txRef, {
               amount: payment.amount,
               type: 'IN',
               category: isPaymentCorrection ? 'AJUSTE_POSITIVO' : 'VENTA_POS',
               description: isPaymentCorrection ? \`NUEVO PAGO (Edición) - Fac: \${invoiceId}\` : \`Cobro Venta POS - Fac: \${invoiceId}\`,
               sourceAccountId: null,
               destinationAccountId: targetAccountId,
               date: serverTimestamp(),
               createdBy: currentUser.uid,
               metadata: { orderId: paymentModalOrder.id, invoiceId: invoiceId, isCorrection: isPaymentCorrection }
             });

             if (accDoc.exists()) {
               t.update(accRef, { balance: (accDoc.data().balance || 0) + payment.amount });
             }
           });
        }
      }
      // --- FIN INTEGRACION CON FINANZAS ---`;

f = f.replace(oldFin, newFin);

// Reset state
f = f.replace(/setIsMultiplePayments\(false\);/, "setIsMultiplePayments(false);\n      setIsPaymentCorrection(false);");

fs.writeFileSync('src/pages/POS.jsx', f, 'utf8');
console.log('Fixed POS edit payment logic.');
