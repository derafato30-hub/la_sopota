const fs = require('fs');
let gastos = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

gastos = gastos.replace(
  /if \(p\.method === 'CONSUMO_PROPIO'\) \{\s*if \(\!isConsumoTotal\) stats\.consumoInterno = \(stats\.consumoInterno \|\| 0\) \+ pAmt;\s*return;\s*\}/,
  `if (p.method === 'CONSUMO_PROPIO') {
             if (!isConsumoTotal) {
                stats.consumoInterno = (stats.consumoInterno || 0) + pAmt;
                stats.ventaTotal -= pAmt;
             }
             return;
          }`
);

fs.writeFileSync('src/pages/Gastos.jsx', gastos);
