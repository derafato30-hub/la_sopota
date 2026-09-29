const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

const searchTarget = /              const totalAdded = splitPayments\.reduce\(\(acc, p\) => acc \+ p\.amount, 0\);\s*              const remaining = Math\.max\(0, finalTotal - totalAdded\);/;

const replacement = `              let expectedToCollect = baseTotal;
              if (hasDelivery && deliveryPaidByTransfer) {
                 expectedToCollect = finalTotal;
              }
              const totalAdded = splitPayments.reduce((acc, p) => acc + p.amount, 0);
              const remaining = Math.max(0, expectedToCollect - totalAdded);`;

if (code.match(searchTarget)) {
  code = code.replace(searchTarget, replacement);
  fs.writeFileSync('src/pages/POS.jsx', code);
  console.log('Replaced remaining calculation successfully');
} else {
  console.log('Could not find searchTarget');
}
