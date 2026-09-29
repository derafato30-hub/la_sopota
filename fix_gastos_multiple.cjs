const fs = require('fs');
let code = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

code = code.replace(
  "let remainingDeliveryToAllocate = (o.orderType === 'ENVIO_COBRADO' && o.deliveryPaidByTransfer) ? (o.deliveryFee || 0) : 0;",
  "let remainingDeliveryToAllocate = (o.orderType === 'ENVIO_COBRADO') ? (o.deliveryFee || 0) : 0;"
);

code = code.replace(
  /if \(remainingDeliveryToAllocate > 0 && p\.method === 'TRANSFERENCIA'\) \{\s*deliveryPortion = Math\.min\(pAmt, remainingDeliveryToAllocate\);\s*stats\.enviosTransferencia \+= deliveryPortion;\s*remainingDeliveryToAllocate \-= deliveryPortion;\s*\}/,
  `if (remainingDeliveryToAllocate > 0) {
            if (o.deliveryPaidByTransfer && p.method === 'TRANSFERENCIA') {
               deliveryPortion = Math.min(pAmt, remainingDeliveryToAllocate);
               stats.enviosTransferencia += deliveryPortion;
               remainingDeliveryToAllocate -= deliveryPortion;
            } else if (!o.deliveryPaidByTransfer && p.method === 'EFECTIVO') {
               deliveryPortion = Math.min(pAmt, remainingDeliveryToAllocate);
               // We don't have enviosEfectivo stats, we just subtract it from the food portion
               remainingDeliveryToAllocate -= deliveryPortion;
            }
          }`
);

code = code.replace(
  "stats.efectivoVentas += pAmt;",
  "stats.efectivoVentas += foodPortion;"
);

fs.writeFileSync('src/pages/Gastos.jsx', code);
