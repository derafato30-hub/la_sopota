const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Add Edit button to Pendientes de Pago and Entregados Hoy
code = code.replace(
  /<button className="btn-secondary" style=\{\{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'\}\} onClick=\{\(\) => handleReprintInvoice\(o\)\}>🖨️ Imprimir Factura<\/button>/g,
  `<button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
                  <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #2196F3', color: '#2196F3'}} onClick={() => handleEditOrder(o)}>✏️ Editar Orden</button>`
);

// 2. Modify handleSendToKitchen
const s1 = `await updateDoc(doc(db, 'orders', editingOrderId), {`;
const s2 = `clienteId: selectedCustomer.id,
          clientName: selectedCustomer.name || 'Cliente Genérico',
          orderType,
          items: cart,
          total,
          foodTotal: total,
          scheduledTime: scheduledTime || null
        });`;

const searchStr = `if (editingOrderId) {
        ${s1}
          ${s2}
        await logAuditAction(asDraft ? 'NUEVO_BORRADOR' : 'ACTUALIZAR_ORDEN', 'POS', \`Orden actualizada para \${selectedCustomer.name}\`, currentUser);`;

if (!code.includes('const orderRef = doc(db')) {
  // Use regex
  code = code.replace(/if \(editingOrderId\) \{[\s\S]*?toast\.success\(asDraft \? "¡Borrador guardado!" : "¡Orden actualizada!"\);/m, 
`if (editingOrderId) {
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
        toast.success(asDraft ? "¡Borrador guardado!" : "¡Orden actualizada!");`
  );
}

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Done');
