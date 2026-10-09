const fs = require('fs');
const path = 'src/pages/Gastos.jsx';
let f = fs.readFileSync(path, 'utf8');

const oldStats = `    snapExp.forEach(doc => {
      const e = doc.data();
      // Ignorar gastos del backoffice (Inversiones, Nomina, etc.)
      if (e.category && e.category !== 'CAJA_CHICA') return;

      if (e.isThirdParty) {
        if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
          stats.pagosRepartidores += e.amount;
        } else {
          stats.gastosTerceros += e.amount;
        }
      } else {
        stats.gastosOperativos += e.amount;
      }
    });`;

const newStats = `    snapExp.forEach(doc => {
      const e = doc.data();
      // Ignorar gastos del backoffice (Inversiones, Nomina, etc.)
      if (e.category && e.category !== 'CAJA_CHICA') return;

      if (!e.sourceAccountId || e.sourceAccountId === 'efectivo_caja') {
        if (e.isThirdParty) {
          if (e.reason && e.reason.toLowerCase().includes('repartidor')) {
            stats.pagosRepartidores += e.amount;
          } else {
            stats.gastosTerceros += e.amount;
          }
        } else {
          stats.gastosOperativos += e.amount;
        }
      }
    });`;

f = f.replace(oldStats, newStats);

fs.writeFileSync(path, f, 'utf8');
console.log("Gastos.jsx patched calcularTotales.");
