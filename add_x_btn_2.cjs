const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Use a flexible regex that doesn't rely on the emoji or exact spacing
const targetRegex = /<h2[^>]*?>\s*.*Checkout de la Orden\s*<\/h2>/;

const replacementStr = `<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--accent-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin: 0}}>🛒 Checkout de la Orden</h2>
                <button className="icon-btn" onClick={() => setShowCheckoutModal(false)}>❌</button>
              </div>`;

f = f.replace(targetRegex, replacementStr);
fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Fixed X button correctly');
