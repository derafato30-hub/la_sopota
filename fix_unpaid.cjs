const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /setModalDeliveryFee\(unpaidWarningOrder\.deliveryFee \|\| 0\);\s*setIncludeDeliveryInInvoice\(true\);/g,
  `setModalDeliveryFee(unpaidWarningOrder.deliveryFee || 0); setIncludeDeliveryInInvoice(unpaidWarningOrder.includeDeliveryInInvoice ?? true); setDeliveryPaidByTransfer(unpaidWarningOrder.deliveryPaidByTransfer || false);`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Fixed unpaidWarningOrder manually');
