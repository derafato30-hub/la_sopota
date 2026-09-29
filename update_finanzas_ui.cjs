const fs = require('fs');

let code = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. Add Dashboard.css import
if (!code.includes("import './Dashboard.css';")) {
  code = code.replace("import './Gastos.css';", "import './Gastos.css';\nimport './Dashboard.css';");
}

// 2. Add Historial Tab state
if (!code.includes("'HISTORIAL'")) {
  code = code.replace(
    /const \[activeTab, setActiveTab\] = useState\('PL'\);/,
    "const [activeTab, setActiveTab] = useState('PL'); // PL, REGISTRO, COBRAR, HISTORIAL"
  );
  
  code = code.replace(
    /<button \n          onClick=\{\(\) => setActiveTab\('COBRAR'\)\}\n          style=\{\{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'COBRAR' \? 'var\(--primary-color\)' : 'var\(--text-color\)', borderBottom: activeTab === 'COBRAR' \? '3px solid var\(--primary-color\)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' \}\}\n        >\n          Cuentas por Cobrar\n        <\/button>/,
    `<button 
          onClick={() => setActiveTab('COBRAR')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'COBRAR' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'COBRAR' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Cuentas por Cobrar
        </button>
        <button 
          onClick={() => setActiveTab('HISTORIAL')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', color: activeTab === 'HISTORIAL' ? 'var(--primary-color)' : 'var(--text-color)', borderBottom: activeTab === 'HISTORIAL' ? '3px solid var(--primary-color)' : '3px solid transparent', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Historial de Gastos
        </button>`
  );

  code = code.replace(
    /\{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser=\{currentUser\} \/>\}/,
    `{activeTab === 'COBRAR' && <CuentasPorCobrar currentUser={currentUser} />}\n      {activeTab === 'HISTORIAL' && <HistorialGastos />}`
  );
}

// 3. Add Historial Component
if (!code.includes("function HistorialGastos()")) {
  code += `

// ----------------------------------------------------
// TAB 4: HISTORIAL DE GASTOS
// ----------------------------------------------------
function HistorialGastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState('TODOS');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchGastos();
  }, []);

  const fetchGastos = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setGastos(list);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const filteredGastos = gastos.filter(g => {
    let passCat = filterCategory === 'TODOS' || g.category === filterCategory;
    let passDate = true;
    if (filterDate) {
      const gDate = g.createdAt?.toDate ? g.createdAt.toDate().toISOString().split('T')[0] : '';
      passDate = gDate === filterDate;
    }
    return passCat && passDate;
  });

  const totalFiltered = filteredGastos.reduce((acc, g) => acc + (g.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: 'var(--border-radius)', border: 'var(--glass-border)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Filtrar por Categoría</label>
          <select className="input-field" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="TODOS">Todas las Categorías</option>
            <option value="CAJA_CHICA">Caja Chica (Cajera)</option>
            <option value="INVENTARIO">Inventario / Compras Mayores</option>
            <option value="NOMINA">Nómina / Sueldos</option>
            <option value="ADMINISTRATIVO">Gastos Administrativos</option>
            <option value="INVERSION">Inversiones</option>
            <option value="PERSONAL">Gastos Personales</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Filtrar por Fecha (Opcional)</label>
          <input type="date" className="input-field" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div>
          <button className="btn-secondary" onClick={() => { setFilterCategory('TODOS'); setFilterDate(''); }}>Limpiar Filtros</button>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Registro de Gastos</h3>
          <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', padding: '0.5rem 1rem', borderRadius: '1rem', fontWeight: 'bold' }}>
            Total Filtrado: L. {totalFiltered.toFixed(2)}
          </div>
        </div>

        {loading ? <p>Cargando gastos...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Motivo / Descripción</th>
                <th>Monto</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {filteredGastos.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay gastos en esta selección.</td></tr>
              ) : (
                filteredGastos.map(g => (
                  <tr key={g.id}>
                    <td>{g.createdAt?.toDate ? g.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                    <td><span style={{ fontSize: '0.8rem', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>{g.category || 'N/A'}</span></td>
                    <td>{g.reason}</td>
                    <td style={{ color: '#f44336', fontWeight: 'bold' }}>L. {(g.amount || 0).toFixed(2)}</td>
                    <td>{g.source || 'Caja (Default)'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;
}

fs.writeFileSync('src/pages/Finanzas.jsx', code);
