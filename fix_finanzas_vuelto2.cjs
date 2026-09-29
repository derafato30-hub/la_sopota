const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const regex = /\} else if \(d\.metodoPago === 'MULTIPLE' && d\.pagosMultiples\) \{[\s\S]*?ingresosCash \+= collectedCash;\s*\}/;

const replacement = `} else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
            let totalAdded = 0;
            d.pagosMultiples.forEach(p => totalAdded += p.amount);
            let vuelto = Math.max(0, totalAdded - (d.total || 0));
            
            let collectedCash = 0;
            d.pagosMultiples.forEach(p => {
               if(p.method === 'EFECTIVO' || p.method === 'TRANSFERENCIA') collectedCash += p.amount;
            });
            
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

f = f.replace(regex, replacement);
fs.writeFileSync('src/pages/Finanzas.jsx', f);
