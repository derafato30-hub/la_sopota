const fs = require('fs');
let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
            let collectedCash = 0;
            d.pagosMultiples.forEach(p => {
               if(p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA') collectedCash += p.amount;
            });
            let d_fee = delivery;
            if (collectedCash >= d_fee) {
               ingresosDelivery += d_fee;
               ingresosFood += (collectedCash - d_fee);
            } else {
               ingresosDelivery += collectedCash;
            }
            ingresosCash += collectedCash;
          }`;

const replacement = `          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
            let totalAdded = 0;
            d.pagosMultiples.forEach(p => totalAdded += p.amount);
            let vuelto = Math.max(0, totalAdded - (d.total || 0));

            let collectedCash = 0;
            d.pagosMultiples.forEach(p => {
               if(p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA') collectedCash += p.amount;
            });
            
            // Subtract vuelto
            collectedCash = Math.max(0, collectedCash - vuelto);

            let d_fee = delivery;
            if (collectedCash >= d_fee) {
               ingresosDelivery += d_fee;
               ingresosFood += (collectedCash - d_fee);
            } else {
               ingresosDelivery += collectedCash;
            }
            ingresosCash += collectedCash;
          }`;

if (finanzas.includes(target)) {
  finanzas = finanzas.replace(target, replacement);
  fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
  console.log('Match replaced!');
} else {
  // try regex or split
  console.log('Target not found exactly. Check line endings.');
}
