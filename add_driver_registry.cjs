const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

// 1. Add state variable
if (!code.includes('const [drivers, setDrivers]')) {
  code = code.replace(
    /const \[customers, setCustomers\] = useState\(\[\]\);/g,
    `const [customers, setCustomers] = useState([]);\n  const [drivers, setDrivers] = useState([]);`
  );
}

// 2. Fetch drivers
if (!code.includes('const driverSnap = await getDocs(collection(db, \'drivers\'));')) {
  code = code.replace(
    /const custSnap = await getDocs\(collection\(db, 'clients'\)\);\n\s*setCustomers\(custSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\)\);/g,
    `const custSnap = await getDocs(collection(db, 'clients'));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const driverSnap = await getDocs(collection(db, 'drivers'));
      setDrivers(driverSnap.docs.map(d => ({ id: d.id, ...d.data() })));`
  );
}

// 3. Update the Dispatch Modal inputs
const searchInput = `<input type="text" className="input-field" value={driverName} onChange={e => setDriverName(e.target.value)} autoFocus />`;
const replaceInput = `<input type="text" className="input-field" value={driverName} onChange={e => {
                const val = e.target.value;
                setDriverName(val);
                const found = drivers.find(d => d.name.toLowerCase() === val.toLowerCase());
                if (found && found.phone) {
                  setDriverPhone(found.phone);
                }
              }} list="drivers-list" autoFocus />
              <datalist id="drivers-list">
                {drivers.map(d => <option key={d.id} value={d.name} />)}
              </datalist>`;

if (!code.includes('list="drivers-list"')) {
  code = code.replace(searchInput, replaceInput);
}

// 4. Save driver on dispatch
const searchSave = `await updateDoc(doc(db, 'orders', dispatchOrder.id), {
                  estadoEntrega: 'ENTREGADO',
                  driverName,
                  driverPhone
                });`;
const replaceSave = `await updateDoc(doc(db, 'orders', dispatchOrder.id), {
                  estadoEntrega: 'ENTREGADO',
                  driverName,
                  driverPhone
                });
                
                if (driverName.trim()) {
                  await setDoc(doc(db, 'drivers', driverName.trim().toLowerCase().replace(/\\s+/g, '_')), {
                    name: driverName.trim(),
                    phone: driverPhone.trim()
                  });
                }`;

if (!code.includes('doc(db, \'drivers\'')) {
  code = code.replace(searchSave, replaceSave);
}

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Added driver registry');
