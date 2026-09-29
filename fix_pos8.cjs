const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Add state
const stateSearch = `  const [unpaidWarningOrder, setUnpaidWarningOrder] = useState(null);`;
const stateReplace = `  const [unpaidWarningOrder, setUnpaidWarningOrder] = useState(null);
  const [showDriverPaymentPrompt, setShowDriverPaymentPrompt] = useState(false);
  const [driverPaymentAmount, setDriverPaymentAmount] = useState('');`;

code = code.replace(stateSearch, stateReplace);

// 2. Replace the unpaidWarningOrder modal content
const modalSearchRegex = /<div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>[\s\S]*?<button className="btn-secondary" style={{marginTop: '1.5rem', width: '100%'}} onClick={\(\) => setUnpaidWarningOrder\(null\)}>Cancelar<\/button>/;

const modalReplace = `<div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {!showDriverPaymentPrompt ? (
                <>
                  <button className="btn-secondary" onClick={() => {
                    if (unpaidWarningOrder.orderType === 'ENVIO_COBRADO') {
                      setShowDriverPaymentPrompt(true);
                    } else {
                      updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      setUnpaidWarningOrder(null);
                    }
                  }}>Dejar como Pendiente de Pago</button>
                  <button className="btn-primary" style={{backgroundColor: '#FF9800'}} onClick={() => {
                    setPaymentMethod('EFECTIVO'); 
                    setAmountReceived(''); 
                    setSplitPayments([]);
                    setCurrentPaymentAmount('');
                    setModalDeliveryFee(unpaidWarningOrder.deliveryFee || 0); 
                    setIncludeDeliveryInInvoice(true); 
                    setPaymentModalOrder(unpaidWarningOrder);
                  
                    setUnpaidWarningOrder(null);
                  }}>Cobrar Ahora</button>
                </>
              ) : (
                <div style={{textAlign: 'left', padding: '1rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px'}}>
                  <p style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>¿Le pagaste el envío al repartidor de la caja?</p>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="Monto pagado al repartidor" 
                    value={driverPaymentAmount}
                    onChange={e => setDriverPaymentAmount(e.target.value)}
                    style={{marginBottom: '1rem'}}
                  />
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-primary" style={{flex: 1}} onClick={async () => {
                      const amount = Number(driverPaymentAmount);
                      if (amount > 0) {
                        try {
                          await addDoc(collection(db, 'expenses'), {
                            reason: \`Pago a repartidor (Orden \${unpaidWarningOrder.clientName})\`,
                            amount: amount,
                            date: new Date().toISOString().split('T')[0],
                            createdAt: serverTimestamp(),
                            isThirdParty: true,
                            invoiceNumber: '',
                            sellerName: unpaidWarningOrder.clientName
                          });
                          await updateDoc(doc(db, 'orders', unpaidWarningOrder.id), {
                            deliveryFee: amount,
                            deliveryPaidByTransfer: true,
                            includeDeliveryInInvoice: true,
                            estadoEntrega: 'ENTREGADO'
                          });
                          toast.success('Envío pagado y sumado a la deuda del cliente');
                        } catch (e) {
                          toast.error('Error al registrar el pago al repartidor');
                        }
                      } else {
                        await updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      }
                      setShowDriverPaymentPrompt(false);
                      setDriverPaymentAmount('');
                      setUnpaidWarningOrder(null);
                    }}>Confirmar</button>
                    <button className="btn-secondary" style={{flex: 1}} onClick={() => {
                      updateOrderStatus(unpaidWarningOrder.id, 'estadoEntrega', 'ENTREGADO');
                      setShowDriverPaymentPrompt(false);
                      setDriverPaymentAmount('');
                      setUnpaidWarningOrder(null);
                    }}>No pagué nada</button>
                  </div>
                </div>
              )}
            </div>
            {!showDriverPaymentPrompt && (
              <button className="btn-secondary" style={{marginTop: '1.5rem', width: '100%'}} onClick={() => setUnpaidWarningOrder(null)}>Cancelar</button>
            )}`;

if (code.match(modalSearchRegex)) {
  code = code.replace(modalSearchRegex, modalReplace);
  fs.writeFileSync('src/pages/POS.jsx', code);
  console.log('Fixed unpaid warning modal');
} else {
  console.log('Could not find modal match');
}
