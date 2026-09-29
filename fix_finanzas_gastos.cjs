const fs = require('fs');

// 1. Fix Finanzas.jsx Tabs
let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// Insert the Historial button if not there
if (!finanzas.includes(">Historial de Gastos<")) {
  const buttonCode = `
        <button 
          onClick={() => setActiveTab('HISTORIAL')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'HISTORIAL' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'HISTORIAL' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Historial de Gastos
        </button>
      </div>`;
  finanzas = finanzas.replace('      </div>\n\n      {activeTab === \'PL\'', buttonCode + '\n\n      {activeTab === \'PL\'');
}

// Insert the component render if not there
if (!finanzas.includes("<HistorialGastos />")) {
  finanzas = finanzas.replace(
    "{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}",
    "{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}\n      {activeTab === 'HISTORIAL' && <HistorialGastos />}"
  );
}

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);

// 2. Fix Gastos.jsx Filtering
let gastos = fs.readFileSync('src/pages/Gastos.jsx', 'utf-8');

// The loop where it sums expenses:
/*
    snapExp.forEach(doc => {
      const e = doc.data();
      if (e.isThirdParty) {
*/
if (!gastos.includes("if (e.category && e.category !== 'CAJA_CHICA') return;")) {
  gastos = gastos.replace(
    /snapExp\.forEach\(doc => \{\s*const e = doc\.data\(\);\s*if \(e\.isThirdParty\)/,
    `snapExp.forEach(doc => {
      const e = doc.data();
      // Ignorar gastos del backoffice (Inversiones, Nomina, etc.)
      if (e.category && e.category !== 'CAJA_CHICA') return;

      if (e.isThirdParty)`
  );
}

// 3. Fix Gastos.jsx History list Filtering
/*
const fetchGastos = async () => {
    ...
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(50));
    ...
      snap.forEach(doc => {
        gastosData.push({ id: doc.id, ...doc.data() });
      });
*/
if (!gastos.includes("if (data.category && data.category !== 'CAJA_CHICA') return;")) {
  gastos = gastos.replace(
    /snap\.forEach\(doc => \{\s*gastosData\.push\(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\);\s*\}\);/,
    `snap.forEach(doc => {
        const data = doc.data();
        if (data.category && data.category !== 'CAJA_CHICA') return;
        gastosData.push({ id: doc.id, ...data });
      });`
  );
}

fs.writeFileSync('src/pages/Gastos.jsx', gastos);
console.log('Fixed tabs and filtering');
