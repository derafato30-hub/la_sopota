const fs = require('fs');
let f = fs.readFileSync('src/pages/ClubCadetes/CocinaTab.jsx', 'utf8');

const regex = /\{order\.dishName\}\s*<\/span>\s*\)\}\s*<\/div>/g;
const replaceWith = `{order.dishName}</span>)}</div><button onClick={() => handleDeleteOrder(order.id)} style={{ background: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', padding: '0.2rem' }}><Trash2 size={16} /></button>`;

f = f.replace(regex, replaceWith);
fs.writeFileSync('src/pages/ClubCadetes/CocinaTab.jsx', f);
console.log("Fixed Trash2");
