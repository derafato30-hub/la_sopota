const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

const regex = /(<label htmlFor="includeDelivery".*?<\/label>\s*<\/div>\s*\)\})/g;

const replacement = `$1
                
                {paymentModalOrder.orderType === 'ENVIO_COBRADO' && (
                  <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px', border: '1px solid rgba(246, 167, 75, 0.3)'}}>
                    <input 
                      type="checkbox" 
                      id="deliveryPaidByTransfer" 
                      checked={deliveryPaidByTransfer} 
                      onChange={e => setDeliveryPaidByTransfer(e.target.checked)} 
                    />
                    <label htmlFor="deliveryPaidByTransfer" style={{cursor: 'pointer', fontSize: '0.9rem', margin: 0}}>El cliente depositó/transfirió también el cobro de envío (L. {modalDeliveryFee})</label>
                  </div>
                )}`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/pages/POS.jsx', code);
  console.log('Replaced UI successfully');
} else {
  console.log('Could not find search string in POS.jsx');
}
