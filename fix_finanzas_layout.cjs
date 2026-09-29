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

finanzas = finanzas.replace(target, replacement);

finanzas = finanzas.replace(
  "ingresosReales: ingresosCash,",
  "ingresosReales: ingresosCash, ingresosFood, ingresosDelivery,"
);

finanzas = finanzas.replace(
  "Ventas de Contado: L. {data.ingresosReales.toFixed(2)}",
  "Ventas de Contado: L. {(data.ingresosFood || 0).toFixed(2)}</div><div style={{fontSize: '0.75rem', marginTop: '0.2rem', color: '#ffeb3b'}}>+ Envíos Recaudados: L. {(data.ingresosDelivery || 0).toFixed(2)}"
);

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
