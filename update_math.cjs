const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `const ingresosTotales = data.ingresosReales + data.abonos;
  const gastosRestables = data.cajaChica + data.operativos + data.nomina + data.administrativos;
  const flujoNeto = ingresosTotales - gastosRestables;`.replace(/\n/g, '\r\n');

const rep = `const ingresosTotales = data.ingresosReales + data.abonos;
  const gastosRestables = data.cajaChica + data.operativos + data.nomina + data.administrativos;
  const gananciaOperativa = ingresosTotales - gastosRestables;
  const balanceReal = gananciaOperativa - data.personales + data.inversiones;`;

let replaced = f.replace(target, rep);

// Also replace flujoNeto bindings with gananciaOperativa in the old card
replaced = replaced.replace(/flujoNeto/g, 'gananciaOperativa');

fs.writeFileSync('src/pages/Finanzas.jsx', replaced);
console.log("Replaced variables");
