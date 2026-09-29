const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.jsx', 'utf-8');

code = code.replace(
  /<button style=\{\{position: 'absolute', top: '10px', left: '50%', zIndex: 9999, background: 'red', color: 'white', padding: '10px'\}\} onClick=\{async \(\) => \{[\s\S]*?\}\}>🚨 CORREGIR FAC-0569 🚨<\/button>/,
  ''
);

fs.writeFileSync('src/pages/POS.jsx', code);
