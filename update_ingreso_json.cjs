const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

// 1. Add json file input ref and handler
const handler = `
  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultJson = JSON.parse(event.target.result);
        if (!Array.isArray(resultJson)) throw new Error("El archivo no contiene un arreglo JSON.");

        const newDrafts = resultJson.map(item => {
          const matchDish = menuItems.find(m => m.name.toLowerCase() === (item.dishName || '').toLowerCase());
          return {
            id: Date.now().toString() + Math.random(),
            cadetName: (item.cadetName || 'Desconocido').toUpperCase(),
            year: YEARS.includes(item.year) ? item.year : 'Extra',
            dishId: matchDish ? matchDish.id : '', 
            dishName: matchDish ? matchDish.name : (item.dishName || 'Desconocido'),
            price: matchDish ? matchDish.price : 0,
            status: 'PENDING',
            hasError: !matchDish 
          };
        });

        setDraftOrders([...draftOrders, ...newDrafts]);
        toast.success(\`Se cargaron \${newDrafts.length} pedidos desde el archivo\`);
      } catch (err) {
        console.error(err);
        toast.error("El archivo JSON no es válido o está mal formateado.");
      } finally {
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
`;

// Insert after updateDraftDish
f = f.replace("const updateDraftDish = (id, newDishId) => {", handler + "\n\n  const updateDraftDish = (id, newDishId) => {");

// Add jsonInputRef
f = f.replace("const fileInputRef = useRef(null);", "const fileInputRef = useRef(null);\n  const jsonInputRef = useRef(null);");

// Add button to UI
const uploadUi = `<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Sube una foto del cuaderno o captura de excel. La IA detectará los nombres, el platillo y el año.
          </p>`;

const newUploadUi = `<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Sube una foto del cuaderno o un archivo JSON generado externamente.
          </p>
          <input 
            type="file" 
            accept=".json" 
            ref={jsonInputRef} 
            style={{ display: 'none' }} 
            onChange={handleJsonUpload}
          />
          <button 
            className="btn-secondary" 
            onClick={() => jsonInputRef.current?.click()}
            style={{ width: '100%', borderColor: '#4CAF50', color: '#4CAF50', marginBottom: '0.5rem' }}
          >
            Subir Archivo JSON
          </button>`;

f = f.replace(uploadUi, newUploadUi);

fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("IngresoTab updated with JSON");
