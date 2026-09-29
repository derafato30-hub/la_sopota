const fs = require('fs');
let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `      let ingresosCash = 0;
      invSnap.forEach(doc => {
        const d = doc.data();
        if (d.estado !== 'ANULADA') {
          if (d.metodoPago !== 'CREDITO' && d.metodoPago !== 'MULTIPLE' && d.metodoPago !== 'CONSUMO_PROPIO' && d.metodoPago !== 'CORTESIA') {
            ingresosCash += d.total || 0;
          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
            d.pagosMultiples.forEach(p => {
              if(p.method !== 'CREDITO' && p.method !== 'CONSUMO_PROPIO' && p.method !== 'CORTESIA' && p.method !== 'PAGO_REPARTIDOR') ingresosCash += p.amount;
            });
          }
        }
      });`;

const target2 = `      let ingresosCash = 0;\r
      invSnap.forEach(doc => {\r
        const d = doc.data();\r
        if (d.estado !== 'ANULADA') {\r
          if (d.metodoPago !== 'CREDITO' && d.metodoPago !== 'MULTIPLE' && d.metodoPago !== 'CONSUMO_PROPIO' && d.metodoPago !== 'CORTESIA') {\r
            ingresosCash += d.total || 0;\r
          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {\r
            d.pagosMultiples.forEach(p => {\r
              if(p.method !== 'CREDITO' && p.method !== 'CONSUMO_PROPIO' && p.method !== 'CORTESIA' && p.method !== 'PAGO_REPARTIDOR') ingresosCash += p.amount;\r
            });\r
          }\r
        }\r
      });`;

const replacement = `      let ingresosCash = 0;
      let ingresosFood = 0;
      let ingresosDelivery = 0;
      invSnap.forEach(doc => {
        const d = doc.data();
        if (d.estado !== 'ANULADA') {
          const food = d.foodTotal !== undefined ? d.foodTotal : (d.total - (d.deliveryFee || 0));
          const delivery = d.orderType === 'ENVIO_COBRADO' ? (d.deliveryFee || 0) : 0;
          
          if (d.metodoPago !== 'CREDITO' && d.metodoPago !== 'MULTIPLE' && d.metodoPago !== 'CONSUMO_PROPIO' && d.metodoPago !== 'CORTESIA') {
            ingresosFood += food;
            ingresosDelivery += delivery;
            ingresosCash += d.total || 0;
          } else if (d.metodoPago === 'MULTIPLE' && d.pagosMultiples) {
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
          }
        }
      });`;

if (finanzas.includes(target)) {
  finanzas = finanzas.replace(target, replacement);
} else if (finanzas.includes(target2)) {
  finanzas = finanzas.replace(target2, replacement);
} else {
  console.log("Not found!");
}

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
