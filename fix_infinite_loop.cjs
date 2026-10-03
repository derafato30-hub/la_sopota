const fs = require('fs');

let f = fs.readFileSync('src/App.jsx', 'utf8');

f = f.replace(/  \/\/ Validacin de mdulo \(Granular Permissions\)[\s\S]*?  return children;/m, `  // Validacion de modulo (Granular Permissions)
  if (moduleName && !hasPermission(moduleName)) {
    // En lugar de redirigir a "/", mostramos un mensaje de Acceso Denegado para evitar loops infinitos
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-color)' }}>
        <h2>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No tienes permiso para ver este mdulo.</p>
      </div>
    );
  }

  return children;`);

fs.writeFileSync('src/App.jsx', f);
console.log("Fixed infinite loop in App.jsx");
