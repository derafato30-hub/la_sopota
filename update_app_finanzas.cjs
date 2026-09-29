const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

if (!code.includes('import Finanzas')) {
  code = code.replace(
    /import Colaboradores from '\.\/pages\/Colaboradores';/,
    `import Colaboradores from './pages/Colaboradores';\nimport Finanzas from './pages/Finanzas';`
  );
}

if (!code.includes('<Route path="finanzas"')) {
  code = code.replace(
    /<Route path="colaboradores" element=\{<Colaboradores \/>\} \/>/,
    `<Route path="finanzas" element={<Finanzas />} />\n            <Route path="colaboradores" element={<Colaboradores />} />`
  );
}

fs.writeFileSync('src/App.jsx', code);
console.log('App.jsx updated with Finanzas route');
