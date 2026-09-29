const fs = require('fs');

let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

// 1. Add club a la data default
f = f.replace(
  "ingresosFood: 0,",
  "ingresosFood: 0, ingresosClub: 0,"
);

// 2. Fetch clubSessions
const queryTarget = `const gastosRef = collection(db, 'expenses');`;
const queryRep = `const gastosRef = collection(db, 'expenses');
      const clubRef = collection(db, 'clubSessions');`;
f = f.replace(queryTarget, queryRep);

// 3. Process clubSessions in fetchData
const snapshotTarget = `const [invSnap, gastosSnap] = await Promise.all([
        getDocs(invQuery),
        getDocs(gastosQuery)
      ]);`;
const snapshotRep = `const [invSnap, gastosSnap, clubSnap] = await Promise.all([
        getDocs(invQuery),
        getDocs(gastosQuery),
        getDocs(query(clubRef, where('status', '==', 'CLOSED'), ...filters))
      ]);`;
f = f.replace(snapshotTarget, snapshotRep);

// 4. Calculate club ingresos
const calcTarget = `// --- PROCESAR GASTOS ---`;
const calcRep = `// --- PROCESAR CLUB ---
      clubSnap.forEach(doc => {
        const d = doc.data();
        // Usamos reportedCash + reportedTransfer o el expected, dependiendo de como quiera el admin.
        // Mejor usar el totalExpected porque es la venta real (los faltantes son otro tema).
        const ingresosClub = d.totalExpected || 0;
        newData.ingresosClub += ingresosClub;
        newData.ingresosReales += ingresosClub;
      });

      // --- PROCESAR GASTOS ---`;
f = f.replace(calcTarget, calcRep);

// 5. Add Breakdown UI
const uiTarget = `<div className="rn-breakdown-item" style={{color: '#ffeb3b'}}>
                <span>+ Envíos Recaudados:</span>`;
const uiRep = `<div className="rn-breakdown-item" style={{color: '#00BCD4'}}>
                <span>+ Club de Cadetes:</span>
                <strong>L. {(data.ingresosClub || 0).toFixed(2)}</strong>
              </div>
              <div className="rn-breakdown-item" style={{color: '#ffeb3b'}}>
                <span>+ Envíos Recaudados:</span>`;
f = f.replace(uiTarget, uiRep);

fs.writeFileSync('src/pages/Finanzas.jsx', f);
console.log("Updated Finanzas.jsx");
