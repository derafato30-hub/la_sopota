const fs = require('fs');
const path = 'src/pages/POS.jsx';
let f = fs.readFileSync(path, 'utf8');

const startIndex = f.indexOf('  const handleConfirmPayment = async (overrideSplitPayments = null) => {');
const endIndex = f.indexOf('  const fetchData = async () => {');

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end index");
  process.exit(1);
}

const before = f.substring(0, startIndex);
const after = f.substring(endIndex);

const newFunction = \`  const handleConfirmPayment = async (overrideSplitPayments = null) => {
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
        invoiceId = \\\`FAC-\\\${String(nextNum).padStart(4, '0')}\\\`;
      }
      
      const cust = customers.find(c => c.id === paymentModalOrder.clienteId);

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
        await setDoc(metaRef, { lastCorrelative: Number(invoiceId.split('-')[1]) });
      }

      const updateData = {
        estadoPago: hasCredit ? 'CREDITO' : (isConsumo ? 'CONSUMO_PROPIO' : 'PAGADO'),
        metodoPago: primaryMethod,
        banco: primaryBank,
        pagosMultiples: effectiveSplitPayments,
        total: finalTotal,
        deliveryFee: hasDelivery ? modalDeliveryFee : 0,
        includeDeliveryInInvoice,
        invoiceId,
        deliveryPaidByTransfer: hasDelivery ? deliveryPaidByTransfer : false 
      };
      
      let vuelto = 0;
      const lastPayment = effectiveSplitPayments[effectiveSplitPayments.length - 1];
      if (totalAdded > finalTotal && lastPayment?.method === 'EFECTIVO') {
         vuelto = totalAdded - finalTotal;
         updateData.vuelto = vuelto;
         updateData.montoRecibido = lastPayment.amount;
      }

      await updateDoc(doc(db, 'orders', paymentModalOrder.id), updateData);
        
      // --- INICIO INTEGRACION CON FINANZAS (LEDGER) ---
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
                 description: \\\`REVERSIÓN (Edición de Pago) - Fac: \${invoiceId}\\\`,
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
               description: isPaymentCorrection ? \\\`NUEVO PAGO (Edición) - Fac: \${invoiceId}\\\` : \\\`Cobro Venta POS - Fac: \${invoiceId}\\\`,
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
      // --- FIN INTEGRACION CON FINANZAS ---

      if (hasCredit && paymentModalOrder.clienteId !== 'generico') {
        const creditTotal = effectiveSplitPayments.filter(p => p.method === 'CREDITO').reduce((acc, p) => acc + p.amount, 0);
        if (creditTotal > 0) {
          const custRef = doc(db, 'clients', paymentModalOrder.clienteId);
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            const currentBalance = custSnap.data().creditBalance || 0;
            await updateDoc(custRef, { creditBalance: currentBalance + creditTotal });
          }
        }
      }

      await logAuditAction(isPaymentCorrection ? 'EDITAR_PAGO' : 'COBRO_ORDEN', 'POS', \\\`Orden cobrada por L.\${finalTotal} (Metodo: \${primaryMethod}). Fac: \${invoiceId}\\\`, currentUser);
      
      setPaymentModalOrder(null);
      setPaymentMethod('EFECTIVO');
      setPaymentBank('Bac Antony');
      setAmountReceived('');
      setSplitPayments([]);
      setCurrentPaymentAmount('');
      setIsMultiplePayments(false);
      setIsPaymentCorrection(false);
      
      loadOrders();
      
      let msg = vuelto > 0 ? \\\`Cobro exitoso.\\nFactura generada: \${invoiceId}\\n\\nVuelto a entregar: L. \${vuelto.toFixed(2)}\\\` : \\\`Cobro registrado.\\nFactura generada: \${invoiceId}\\\`;
      
      if (window.confirm(\\\`\${msg}\\n\\n¿Deseas imprimir la factura ahora?\\\`)) {
        printInvoice({
          ...newInvoice,
          orderType: paymentModalOrder.orderType,
          createdAt: { toDate: () => new Date() }
        });
      }
    } catch(e) { 
      console.error(e);
      toast.error('Error procesando pago: ' + e.message); 
    } finally { 
      setIsProcessingPayment(false); 
    }
  };

\`;

f = before + newFunction + after;
fs.writeFileSync(path, f, 'utf8');
console.log("Successfully replaced handleConfirmPayment.");
