const fs = require('fs');
let f = fs.readFileSync('src/pages/Gastos.jsx', 'utf8');

// Add userRole to useAuth destructuring
f = f.replace(/const \{ currentUser \} = useAuth\(\);/, 'const { currentUser, userRole } = useAuth();');

// Rewrite fetchGastosYCierres
const fetchReplacement = `  const fetchGastosYCierres = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      // Traer gastos (SOLO DE HOY)
      const qGastos = query(collection(db, 'expenses'), where('createdAt', '>=', startOfToday));
      const snapGastos = await getDocs(qGastos);
      let mappedGastos = snapGastos.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filtrar CAJA CHICA y por usuario (si no es admin, solo los de l)
      mappedGastos = mappedGastos.filter(g => {
        if (g.category && g.category !== 'CAJA_CHICA') return false;
        if (userRole !== 'ADMIN' && g.createdBy !== currentUser.uid) return false;
        return true;
      });
      // Ordenar localmente
      mappedGastos.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setGastos(mappedGastos);

      // Traer historial de cierres (ltimos 50 para poder filtrar en memoria)
      const qCierres = query(collection(db, 'dailyClosings'), orderBy('createdAt', 'desc'), limit(50));
      const snapCierres = await getDocs(qCierres);
      let mappedCierres = snapCierres.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filtrar por usuario (si no es admin)
      if (userRole !== 'ADMIN') {
        mappedCierres = mappedCierres.filter(c => c.createdBy === currentUser.uid);
      }
      setCierres(mappedCierres.slice(0, 10)); // Mostrar solo los ltimos 10 del usuario

      await calcularTotalesDelDia();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };`;

// Replace the old fetchGastosYCierres
f = f.replace(/  const fetchGastosYCierres = async \(\) => \{[\s\S]*?  const calcularTotalesDelDia = async \(\) => \{/, fetchReplacement + '\n\n  const calcularTotalesDelDia = async () => {');

fs.writeFileSync('src/pages/Gastos.jsx', f);
console.log("Gastos.jsx updated for scoped viewing and today's limit");
