const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /<input type="number" className="input-field" min="0" value=\{modalDeliveryFee\} onChange=\{e => {/g,
  `<input type="number" className="input-field" min="0" value={modalDeliveryFee} disabled={paymentModalOrder.estadoEntrega === 'ENTREGADO'} onChange={e => {`
);

code = code.replace(
  /<input type="checkbox" id="includeDelivery" checked=\{includeDeliveryInInvoice\} onChange=\{e => setIncludeDeliveryInInvoice\(e\.target\.checked\)\} \/>/g,
  `<input type="checkbox" id="includeDelivery" checked={includeDeliveryInInvoice} disabled={paymentModalOrder.estadoEntrega === 'ENTREGADO'} onChange={e => setIncludeDeliveryInInvoice(e.target.checked)} />`
);

code = code.replace(
  /<input \s*type="checkbox" \s*id="deliveryPaidByTransfer" \s*checked=\{deliveryPaidByTransfer\} \s*onChange=\{e => setDeliveryPaidByTransfer\(e\.target\.checked\)\} \s*\/>/g,
  `<input 
                    type="checkbox" 
                    id="deliveryPaidByTransfer" 
                    checked={deliveryPaidByTransfer} 
                    disabled={paymentModalOrder.estadoEntrega === 'ENTREGADO'}
                    onChange={e => setDeliveryPaidByTransfer(e.target.checked)} 
                  />`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Disabled inputs successfully');
