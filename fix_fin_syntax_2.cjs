const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf-8');

const target = `'--card-bg': flujoNeto >= 0 ? 'rgba(33, 150, 243, 0.05)', gridColumn: '1 / -1'`;
const rep = `'--card-bg': flujoNeto >= 0 ? 'rgba(33, 150, 243, 0.05)' : 'rgba(244, 67, 54, 0.05)', gridColumn: '1 / -1'`;

if (f.includes(target)) {
  f = f.replace(target, rep);
  fs.writeFileSync('src/pages/Finanzas.jsx', f);
  console.log("Fixed syntax error");
} else {
  console.log("Target not found");
}
