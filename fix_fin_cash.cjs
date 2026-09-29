const fs = require('fs');
let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

finanzas = finanzas.replace(
  /if \(d\.metodoPago !== 'CREDITO' && d\.metodoPago !== 'MULTIPLE'\) \{\s*ingresosCash \+= d\.total \|\| 0;\s*\}/,
  `if (d.metodoPago !== 'CREDITO' && d.metodoPago !== 'MULTIPLE' && d.metodoPago !== 'CONSUMO_PROPIO' && d.metodoPago !== 'CORTESIA') {
            ingresosCash += d.total || 0;
          }`
);

finanzas = finanzas.replace(
  /if\(p\.method !== 'CREDITO'\) ingresosCash \+= p\.amount;/,
  `if(p.method !== 'CREDITO' && p.method !== 'CONSUMO_PROPIO' && p.method !== 'CORTESIA' && p.method !== 'PAGO_REPARTIDOR') ingresosCash += p.amount;`
);

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
