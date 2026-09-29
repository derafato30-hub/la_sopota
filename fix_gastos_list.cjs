const fs = require('fs');

let gastos = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

gastos = gastos.replace(
  "setGastos(snapGastos.docs.map(d => ({ id: d.id, ...d.data() })));",
  `const mapped = snapGastos.docs.map(d => ({ id: d.id, ...d.data() }));
      setGastos(mapped.filter(g => !g.category || g.category === 'CAJA_CHICA'));`
);

fs.writeFileSync('src/pages/Gastos.jsx', gastos);
