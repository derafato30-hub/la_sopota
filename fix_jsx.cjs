const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /<button className="btn-secondary" style=\{\{padding: '0\.4rem', border: '1px solid #4CAF50', color: '#4CAF50'\}\} onClick=\{\(\) => handleReprintInvoice\(o\)\}>🖨️ Imprimir Factura<\/button>\s*<button className="btn-secondary" style=\{\{padding: '0\.4rem', border: '1px solid #2196F3', color: '#2196F3'\}\} onClick=\{\(\) => handleEditOrder\(o\)\}>✏️ Editar Orden<\/button>/g,
  `<>
    <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => handleReprintInvoice(o)}>🖨️ Imprimir Factura</button>
    <button className="btn-secondary" style={{padding: '0.4rem', border: '1px solid #2196F3', color: '#2196F3'}} onClick={() => handleEditOrder(o)}>✏️ Editar Orden</button>
  </>`
);

fs.writeFileSync('src/pages/POS.jsx', code);
console.log('Fixed JSX correctly');
