const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Add Edit button to Pendientes de Pago (line 922 ish)
const pendienteListBtn = `<button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>`;
if (!code.includes('handleEditOrder(o)') && code.includes(pendienteListBtn)) {
   code = code.replace(
      pendienteListBtn,
      `<button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>\n                  <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #2196F3', color: '#2196F3'}} onClick={() => handleEditOrder(o)}>✏️ Editar Orden</button>`
   );
}

// 2. Modify handleSendToKitchen to recalculate estadoPago
const sendToKitchenSearch = `if (editingOrderId) {
        await updateDoc(doc(db, 'orders', editingOrderId), {
          clienteId: selectedCustomer.id,
          clientName: selectedCustomer.name || 'Cliente Genérico',
          orderType,
          items: cart,
          total,
          foodTotal: total,
          scheduledTime: scheduledTime || null
        });
        await logAuditAction('ACTUALIZAR_ORDEN', 'POS', \`Orden actualizada para \${selectedCustomer.name}\`, currentUser);
        toast.success(asDraft ? "¡Borrador guardado!" : "¡Orden actualizada!");
      } else {`;

const sendToKitchenReplace = `if (editingOrderId) {
        const orderRef = doc(db, 'orders', editingOrderId);
        const orderSnap = await getDoc(orderRef);
        const updatePayload = {
          clienteId: selectedCustomer.id,
          clientName: selectedCustomer.name || 'Cliente Genérico',
          orderType,
          items: cart,
          total,
          foodTotal: total,
          scheduledTime: scheduledTime || null
        };
        
        if (orderSnap.exists()) {
           const oldData = orderSnap.data();
           if (oldData.estadoPago === 'PAGADO' || oldData.estadoPago === 'CREDITO' || oldData.estadoPago === 'CONSUMO_PROPIO') {
               const oldPayments = oldData.pagosMultiples || [];
               const totalPaid = oldPayments.reduce((acc, p) => acc + p.amount, 0);
               const hasDelivery = orderType === 'ENVIO_COBRADO';
               const expectedTotal = total + (hasDelivery && oldData.deliveryPaidByTransfer ? (oldData.deliveryFee || 0) : 0);
               
               if (expectedTotal > totalPaid) {
                   updatePayload.estadoPago = 'PENDIENTE';
               }
           }
        }
        await updateDoc(orderRef, updatePayload);
        await logAuditAction('ACTUALIZAR_ORDEN', 'POS', \`Orden actualizada para \${selectedCustomer.name}\`, currentUser);
        toast.success(asDraft ? "¡Borrador guardado!" : "¡Orden actualizada!");
      } else {`;

code = code.replace(sendToKitchenSearch, sendToKitchenReplace);

// 3. Pre-fill splitPayments when opening payment modal
code = code.replace(
  /setSplitPayments\(\[\]\);/g,
  `setSplitPayments(o.pagosMultiples || o.splitPayments || []);`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Fixed edits successfully');
