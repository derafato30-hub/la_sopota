const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

// Fix encoding issues
const fixes = {
  'Atlntida': 'Atlántida',
  'Atl.ntida': 'Atlántida',
  'Norteo': 'Norteño',
  'Transaccin': 'Transacción',
  'Categora': 'Categoría',
  'Descripcin': 'Descripción',
  'Prstamo': 'Préstamo',
  'Adquisicin': 'Adquisición',
  'xito': 'éxito',
  'invlido': 'inválido',
  'dnde': 'dónde',
  'Pagu ': 'Pagué ',
  'Transfer ': 'Transferí ',
  'Podrs': 'podrás',
  'Cul': 'Cuál',
  ' ms ': ' más ',
  ' qu ': ' qué ',
  'da ': 'día ',
  'Asesor IA:.*Hola': 'Asesor IA: Hola',
  'automticamente': 'automáticamente',
  'nica': 'Única'
};

for (const [bad, good] of Object.entries(fixes)) {
  f = f.replace(new RegExp(bad, 'g'), good);
}

// Fix seeding logic to not recurse infinitely
const seedingCode = `
  useEffect(() => {
    let syncing = false;
    // Escuchar Cuentas Financieras
    const q = query(collection(db, 'fin_accounts'));
    const unsub = onSnapshot(q, async (snap) => {
      const requiredAccounts = [
        { id: 'efectivo_caja', name: 'Efectivo Caja', type: 'CASH', balance: 0 },
        { id: 'bac_antony', name: 'BAC Antony', type: 'BANK', balance: 0 },
        { id: 'bac_delmy', name: 'BAC Delmy', type: 'BANK', balance: 0 },
        { id: 'bac_elmer', name: 'BAC Elmer', type: 'BANK', balance: 0 },
        { id: 'banpais', name: 'Banpais', type: 'BANK', balance: 0 },
        { id: 'ficohsa', name: 'Ficohsa', type: 'BANK', balance: 0 },
        { id: 'atlantida', name: 'Banco Atlántida', type: 'BANK', balance: 0 },
        { id: 'occidente', name: 'Occidente', type: 'BANK', balance: 0 },
        { id: 'davivienda', name: 'Davivienda', type: 'BANK', balance: 0 },
      ];

      let accs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const existingIds = new Set(accs.map(a => a.id));
      
      const missing = requiredAccounts.filter(a => !existingIds.has(a.id));
      
      if (missing.length > 0 && !syncing) {
        syncing = true;
        try {
          for (const acc of missing) {
            await setDoc(doc(db, 'fin_accounts', acc.id), acc, { merge: true });
          }
        } catch(e) { console.error("Error seeding", e); }
        syncing = false;
      } else {
        setAccounts(accs);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);
`;

f = f.replace(/useEffect\(\(\) => \{\s*let syncing[\s\S]*?\}, \[\]\);/, ''); // remove if exists
f = f.replace(/useEffect\(\(\) => \{\s*\/\/ Escuchar Cuentas Financieras[\s\S]*?\}, \[\]\);/, seedingCode);

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed typos and seeding');
