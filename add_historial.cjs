const fs = require('fs');
const path = 'src/pages/Finanzas.jsx';
let f = fs.readFileSync(path, 'utf8');

// 1. Add History Icon
if (!f.includes('History,')) {
  f = f.replace(/Activity,/, 'Activity, History,');
}

// 2. Insert HistorialTab component before export default function Finanzas
const historialComponent = `
function HistorialTab({ accounts }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // ALL, IN, OUT, TRANSFER
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Por defecto, traer las ultimas 100 o del mes actual para no sobrecargar
      // Si hay dateRange, filtramos. Por ahora traemos todo ordenado por fecha desc
      // Nota: Para produccion real con miles de registros se requiere paginacion
      const q = query(collection(db, 'fin_transactions'), orderBy('date', 'desc'), limit(300));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {
      console.error(e);
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));

  const filtered = transactions.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (dateRange.start) {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      if (d < new Date(dateRange.start + 'T00:00:00')) return false;
    }
    if (dateRange.end) {
      const d = t.date?.toDate ? t.date.toDate() : new Date();
      if (d > new Date(dateRange.end + 'T23:59:59')) return false;
    }
    return true;
  });

  const getAccountName = (id) => {
    if (!id) return '-';
    return accounts.find(a => a.id === id)?.name || id;
  };

  const getBadgeColor = (type) => {
    if (type === 'IN') return '#4CAF50';
    if (type === 'OUT') return '#FF5252';
    return '#2196F3';
  };

  return (
    <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📖 Historial Auditable (Ledger)</h2>
        <button className="btn-secondary" onClick={fetchTransactions} disabled={loading}>
          🔄 Actualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tipo</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
            <option value="ALL">Todas las transacciones</option>
            <option value="IN">Entradas (IN)</option>
            <option value="OUT">Salidas (OUT)</option>
            <option value="TRANSFER">Transferencias (TRANSFER)</option>
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Categoría</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
            <option value="ALL">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Desde</label>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hasta</label>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Fecha</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Tipo</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Monto</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Origen ➡️ Destino</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Categoría</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Descripción / Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando transacciones...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron transacciones para estos filtros.</td></tr>
            ) : (
              filtered.map(t => {
                const dateObj = t.date?.toDate ? t.date.toDate() : new Date();
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                      {dateObj.toLocaleDateString('es-HN')} <br/>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dateObj.toLocaleTimeString('es-HN', {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ backgroundColor: getBadgeColor(t.type), color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: t.type === 'IN' ? '#4CAF50' : t.type === 'OUT' ? '#FF5252' : 'inherit' }}>
                      {t.type === 'OUT' ? '-' : ''}L. {t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{getAccountName(t.sourceAccountId)}</span>
                      <br/>⬇️<br/>
                      <span style={{ color: 'var(--text-primary)' }}>{getAccountName(t.destinationAccountId)}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {t.category || 'SIN_CATEGORIA'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {t.description || '-'}
                        {t.metadata?.invoiceId && (
                           <div style={{ fontSize: '0.75rem', color: '#FF9800', marginTop: '0.25rem' }}>
                             {t.metadata.invoiceId}
                           </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Finanzas({ currentUser, hasPermission }) {`;

f = f.replace(/export default function Finanzas\(\{ currentUser, hasPermission \}\) \{/, historialComponent);

// 3. Add to tabs array
const tabsMenu = `<TabButton active={activeTab === 'PL'} onClick={() => setActiveTab('PL')} icon={<TrendingUp size={18}/>} label="Estado de Resultados" />
        <TabButton active={activeTab === 'HISTORIAL'} onClick={() => setActiveTab('HISTORIAL')} icon={<History size={18}/>} label="Historial (Ledger)" />`;

f = f.replace(/<TabButton active=\{activeTab === 'PL'\}.*\/>/, tabsMenu);

const tabsSwitch = `{activeTab === 'PL' && <PLTab />}
            {activeTab === 'HISTORIAL' && <HistorialTab accounts={accounts} />}`;

f = f.replace(/\{activeTab === 'PL' && <PLTab \/>\}/, tabsSwitch);

fs.writeFileSync(path, f, 'utf8');
console.log('Added HistorialTab');
