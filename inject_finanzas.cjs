const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.jsx', 'utf-8');

// 1. Add TrendingUp icon import
if (!code.includes('TrendingUp')) {
  code = code.replace(
    /import \{\s*LayoutDashboard,/,
    `import {\n  LayoutDashboard,\n  TrendingUp,`
  );
}

// 2. Add navigation link
const findText = `          {hasAccess(['ADMIN']) && (
            <Link to="/colaboradores" className={\`nav-item \${location.pathname === '/colaboradores' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <UserCog size={20} />
              <span>Colaboradores</span>
            </Link>
          )}`;

const replaceText = `          {hasAccess(['ADMIN']) && (
            <Link to="/finanzas" className={\`nav-item \${location.pathname === '/finanzas' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <TrendingUp size={20} />
              <span style={{display: 'flex', flexDirection: 'column'}}>
                <span>Finanzas</span>
                <span style={{fontSize: '0.7rem', color: '#ffb74d'}}>En construcción</span>
              </span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/colaboradores" className={\`nav-item \${location.pathname === '/colaboradores' ? 'active' : ''}\`} onClick={() => setIsSidebarOpen(false)}>
              <UserCog size={20} />
              <span>Colaboradores</span>
            </Link>
          )}`;

if (code.includes('to="/colaboradores"') && !code.includes('to="/finanzas"')) {
  code = code.replace(findText, replaceText);
}

fs.writeFileSync('src/components/Layout.jsx', code);
console.log('Injected Finanzas into Layout');
