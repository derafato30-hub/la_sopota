const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /setSplitPayments\(o\.pagosMultiples \|\| o\.splitPayments \|\| \[\]\);\s*setCurrentPaymentAmount\(''\);\s*setModalDeliveryFee\(unpaidWarningOrder/g,
  `setSplitPayments(unpaidWarningOrder.pagosMultiples || unpaidWarningOrder.splitPayments || []);
                    setCurrentPaymentAmount('');
                    setModalDeliveryFee(unpaidWarningOrder`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Fixed unpaid scope');
