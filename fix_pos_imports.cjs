const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Clean up duplicate imports in the firebase/firestore line
f = f.replace(/import \{([^{}]*?)\} from ["']firebase\/firestore["'];/, (match, group1) => {
  const parts = group1.split(',').map(s => s.trim()).filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return `import { ${uniqueParts.join(', ')} } from "firebase/firestore";`;
});

fs.writeFileSync('src/pages/POS.jsx', f, 'utf8');
console.log('Fixed POS imports');
