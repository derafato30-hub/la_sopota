const fs = require('fs');

let f = fs.readFileSync('src/components/Layout.jsx', 'utf-8');

// Add icon import: Shield
f = f.replace("Menu,", "Menu,\n  Shield,");

// Add Link to nav
const targetLink = `{hasAccess(['ADMIN', 'CAJERO']) && (
            <Link to="/invoices" className={\`nav-item \${location.pathname === '/invoices' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <Receipt size={20} />
              <span>Facturas</span>
            </Link>
          )}`;

const newLink = `{hasAccess(['ADMIN', 'CAJERO']) && (
            <Link to="/invoices" className={\`nav-item \${location.pathname === '/invoices' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <Receipt size={20} />
              <span>Facturas</span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/club" className={\`nav-item \${location.pathname === '/club' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <Shield size={20} />
              <span>Club de Cadetes</span>
            </Link>
          )}`;

f = f.replace(targetLink, newLink);

fs.writeFileSync('src/components/Layout.jsx', f);
console.log("Layout.jsx updated");
