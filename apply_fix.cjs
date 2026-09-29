const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Remove PAGO_REPARTIDOR auto logic in onClick
code = code.replace(/setSplitPayments\(o\.orderType === 'ENVIO_COBRADO' \? \[\{ method: 'PAGO_REPARTIDOR', amount: \(o\.deliveryFee \|\| 0\), isAuto: true \}\] : \[\]\)/g, 'setSplitPayments([])');

// 2. Remove PAGO_REPARTIDOR auto logic for unpaidWarningOrder
code = code.replace(/setSplitPayments\(unpaidWarningOrder\.orderType === 'ENVIO_COBRADO' \? \[\{ method: 'PAGO_REPARTIDOR', amount: \(unpaidWarningOrder\.deliveryFee \|\| 0\), isAuto: true \}\] : \[\]\)/g, 'setSplitPayments([])');

// 3. Fix remaining calculation
const searchTarget = /              const totalAdded = splitPayments\.reduce\(\(acc, p\) => acc \+ p\.amount, 0\);\s*              const remaining = Math\.max\(0, finalTotal - totalAdded\);/;
const replacementTarget = `              let expectedToCollect = baseTotal;
              if (hasDelivery && deliveryPaidByTransfer) {
                 expectedToCollect = finalTotal;
              }
              const totalAdded = splitPayments.reduce((acc, p) => acc + p.amount, 0);
              const remaining = Math.max(0, expectedToCollect - totalAdded);`;
code = code.replace(searchTarget, replacementTarget);

// 4. Add UI checkbox
const uiSearch = `                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input type="checkbox" id="includeDelivery" checked={includeDeliveryInInvoice} onChange={e => setIncludeDeliveryInInvoice(e.target.checked)} />
                  <label htmlFor="includeDelivery" style={{cursor: 'pointer', fontSize: '0.9rem'}}>Mostrar costo de envío en la factura (como cargo de tercero)</label>
                </div>
              </div>
            )}`;

const uiReplacement = `                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input type="checkbox" id="includeDelivery" checked={includeDeliveryInInvoice} onChange={e => setIncludeDeliveryInInvoice(e.target.checked)} />
                  <label htmlFor="includeDelivery" style={{cursor: 'pointer', fontSize: '0.9rem'}}>Mostrar costo de envío en la factura (como cargo de tercero)</label>
                </div>

                <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px', border: '1px solid rgba(246, 167, 75, 0.3)'}}>
                  <input 
                    type="checkbox" 
                    id="deliveryPaidByTransfer" 
                    checked={deliveryPaidByTransfer} 
                    onChange={e => setDeliveryPaidByTransfer(e.target.checked)} 
                  />
                  <label htmlFor="deliveryPaidByTransfer" style={{cursor: 'pointer', fontSize: '0.9rem', margin: 0}}>El cliente depositó/transfirió también el cobro de envío</label>
                </div>
              </div>
            )}`;

code = code.replace(uiSearch, uiReplacement);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('All fixes applied successfully');
