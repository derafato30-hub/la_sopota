const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');

// 1. Add AlertOctagon
f = f.replace("import { Search, Printer, Trash2, AlertOctagon } from 'lucide-react';", "import { Search, Printer, Trash2 } from 'lucide-react';");
f = f.replace("import { Search, Printer, Trash2 } from 'lucide-react';", "import { Search, Printer, Trash2, AlertOctagon } from 'lucide-react';");

// 2. Find Imprimir Listas button and replace it using regex to ignore whitespace
f = f.replace(/<button className="btn-secondary" onClick=\{handlePrint\}[^>]*>[\s\S]*?<Printer size=\{18\} \/>[\s\S]*?Imprimir Listas[\s\S]*?<\/button>/, 
  `<button className="btn-secondary" onClick={handlePrint} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Printer size={18} />
          Imprimir
        </button>
        <button onClick={handleClearTest} style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'transparent', border: '1px solid #f44336', color: '#f44336', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
          <AlertOctagon size={18} />
          Limpiar Pruebas
        </button>`);

// 3. Ensure handleClearTest exists
if (!f.includes("const handleClearTest = async () => {")) {
  const fns = `
  const handleClearTest = async () => {
    if (!confirm("¿ESTÁS SEGURO? Esto eliminará TODOS los pedidos que están PENDIENTES. Usar solo para limpiar pruebas.")) return;
    const pending = orders.filter(o => o.status === 'PENDING');
    if (pending.length === 0) return toast.info("No hay pedidos pendientes para borrar");
    
    try {
      import('firebase/firestore').then(({ deleteDoc, doc }) => {
        pending.forEach(p => {
          deleteDoc(doc(db, 'clubOrders', p.id));
        });
        toast.success(pending.length + " pedidos de prueba eliminados");
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al limpiar");
    }
  };

  const handleToggleStatus = async (order) => {`;
  f = f.replace("const handleToggleStatus = async (order) => {", fns);
}

fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("Fixed CocinaTab");
