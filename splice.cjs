const fs = require('fs');
const lines = fs.readFileSync('src/pages/POS.jsx', 'utf-8').split('\n');
const targetLineIndex = lines.findIndex(l => l.includes('id="includeDelivery"'));

if (targetLineIndex !== -1) {
  lines.splice(targetLineIndex + 2, 0, `
                <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', backgroundColor: 'rgba(246, 167, 75, 0.1)', borderRadius: '8px', border: '1px solid rgba(246, 167, 75, 0.3)'}}>
                  <input 
                    type="checkbox" 
                    id="deliveryPaidByTransfer" 
                    checked={deliveryPaidByTransfer} 
                    onChange={e => setDeliveryPaidByTransfer(e.target.checked)} 
                  />
                  <label htmlFor="deliveryPaidByTransfer" style={{cursor: 'pointer', fontSize: '0.9rem', margin: 0}}>El cliente depositó/transfirió también el cobro de envío</label>
                </div>`);
  fs.writeFileSync('src/pages/POS.jsx', lines.join('\n'));
  console.log('Spliced UI code at line', targetLineIndex + 2);
} else {
  console.log('Could not find includeDelivery');
}
