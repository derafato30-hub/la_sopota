const fs = require('fs');
let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

finanzas = finanzas.replace(
  "if (d.estado !== 'ANULADA') {",
  "if (d.estado !== 'ANULADA' && d.estado !== 'CANCELADA' && d.estadoCocina !== 'CANCELADA' && d.estadoPago !== 'CANCELADO') {"
);

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
