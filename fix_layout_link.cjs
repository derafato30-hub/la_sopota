const fs = require('fs');

let f = fs.readFileSync('src/components/Layout.jsx', 'utf-8');

// Ensure Shield is imported
if (!f.includes('Shield,')) {
  f = f.replace("Menu,", "Menu,\n  Shield,");
}

// Add Link to nav below Invoices
if (!f.includes('Club de Cadetes')) {
  const lines = f.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].includes('<span>Facturas</span>')) {
      // we need to insert after the closing `)}`
      // let's just insert it safely a couple lines down
      out.push(`            </Link>`);
      out.push(`          )}`);
      out.push(``);
      out.push(`          {hasAccess(['ADMIN']) && (`);
      out.push(`            <Link to="/club" className={\`nav-item \${location.pathname === '/club' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>`);
      out.push(`              <Shield size={20} />`);
      out.push(`              <span>Club de Cadetes</span>`);
      out.push(`            </Link>`);
      out.push(`          )}`);
      i += 2; // skip the original closing tags to avoid duplication
    }
  }
  fs.writeFileSync('src/components/Layout.jsx', out.join('\n'));
  console.log("Layout.jsx actually updated");
} else {
  console.log("Already there");
}
