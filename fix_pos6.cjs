const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

const search = `                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input type="checkbox" id="includeDelivery" checked={includeDeliveryInInvoice} onChange={e => setIncludeDeliveryInInvoice(e.target.checked)} />
                  <label htmlFor="includeDelivery" style={{cursor: 'pointer', fontSize: '0.9rem'}}>Mostrar costo de envío en la factura (como cargo de tercero)</label>
                </div>
              </div>
            )}

            {(() => {`;

const replacement = `                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
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
            )}

            {(() => {`;

if (code.includes(search)) {
  code = code.replace(search, replacement);
  fs.writeFileSync('src/pages/POS.jsx', code);
  console.log('Replaced UI successfully');
} else {
  console.log('Could not find search string in POS.jsx');
}
