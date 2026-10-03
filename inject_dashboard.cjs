const fs = require('fs');

let f = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const injection = `
  const [lunesData, setLunesData] = useState(null);

  useEffect(() => {
    const fetchLunes = async () => {
      const start = new Date('2026-09-28T00:00:00.000-06:00');
      const end = new Date('2026-09-28T23:59:59.999-06:00');
      const q = query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end)));
      const snap = await getDocs(q);
      
      let totals = {};
      snap.forEach(doc => {
        const pm = doc.data().paymentMethod || 'desconocido';
        const total = doc.data().total || 0;
        if (!totals[pm]) totals[pm] = 0;
        totals[pm] += total;
      });
      setLunesData(totals);
    };
    fetchLunes();
  }, []);
`;

// Insert after `const [todaySales, setTodaySales] = useState(0);`
f = f.replace(/const \[todaySales, setTodaySales\] = useState\(0\);/g, "const [todaySales, setTodaySales] = useState(0);\n" + injection);

const uiInjection = `
      {lunesData && (
        <div style={{ background: '#f44336', padding: '1rem', borderRadius: '8px', color: 'white', marginBottom: '2rem' }}>
          <h3>⚠️ RESUMEN RECUPERADO: LUNES 28 DE SEPTIEMBRE</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            {Object.entries(lunesData).map(([k, v]) => (
              <li key={k} style={{ fontSize: '1.2rem' }}><strong>{k.toUpperCase()}:</strong> L. {v.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}
`;

f = f.replace(/<div className="card">/i, uiInjection + "\n      <div className=\"card\">");

fs.writeFileSync('src/pages/Dashboard.jsx', f);
console.log("Injected report into Dashboard");
