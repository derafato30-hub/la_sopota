const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Remove auto-confirm for CONSUMO_PROPIO
code = code.replace(
  /newPayments = \[\{ method: 'CONSUMO_PROPIO', amount: finalTotal, bank: null \}\];\s*setSplitPayments\(newPayments\);\s*setCurrentPaymentAmount\(''\);\s*return handleConfirmPayment\(newPayments\);/g,
  `newPayments = [{ method: 'CONSUMO_PROPIO', amount: finalTotal, bank: null }];
                  setSplitPayments(newPayments);
                  setCurrentPaymentAmount('');
                  return;`
);

// 2. Remove auto-confirm for normal payments
code = code.replace(
  /const newTotalAdded = newPayments\.reduce\(\(acc, p\) => acc \+ p\.amount, 0\);\s*if \(newTotalAdded >= finalTotal\) \{\s*\/\/ Completado, auto-confirmar\s*handleConfirmPayment\(newPayments\);\s*\}/g,
  `const newTotalAdded = newPayments.reduce((acc, p) => acc + p.amount, 0);`
);

// 3. Change button text from ➕ Confirmar to ➕ Añadir Pago
code = code.replace(
  /<button className="btn-secondary" style=\{\{width: '100%', borderColor: 'var\(--primary-color\)', color: 'var\(--primary-color\)'\}\} onClick=\{handleAddPayment\}>\s*➕ Confirmar\s*<\/button>/g,
  `<button className="btn-secondary" style={{width: '100%', borderColor: 'var(--primary-color)', color: 'var(--primary-color)'}} onClick={handleAddPayment}>
                            ➕ Añadir Pago
                          </button>`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Removed auto confirm successfully');
