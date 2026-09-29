const fs = require('fs');

let finanzas = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target1 = `        </button>\r
      </div>\r
\r
      {activeTab === 'PL' && <DashboardPL />}`;

const target2 = `        </button>
      </div>

      {activeTab === 'PL' && <DashboardPL />}`;

const buttonCode = `        </button>
        <button 
          onClick={() => setActiveTab('HISTORIAL')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'HISTORIAL' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'HISTORIAL' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Historial de Gastos
        </button>
      </div>

      {activeTab === 'PL' && <DashboardPL />}`;

if (finanzas.includes(target1)) {
  finanzas = finanzas.replace(target1, buttonCode);
} else if (finanzas.includes(target2)) {
  finanzas = finanzas.replace(target2, buttonCode);
} else {
  console.log("Could not find insertion point 1");
}

const render1 = `{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}`;
const render2 = `{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}
      {activeTab === 'HISTORIAL' && <HistorialGastos />}`;

if (finanzas.includes(render1) && !finanzas.includes("HistorialGastos />}")) {
  finanzas = finanzas.replace(render1, render2);
}

fs.writeFileSync('src/pages/Finanzas.jsx', finanzas);
