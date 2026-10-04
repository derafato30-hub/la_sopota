const fs = require('fs');
let f = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

f = f.replace(/  const hasPermission = \(moduleName\) => \{/g, "  const hasPermission = (moduleName) => {\n    if (userRole === 'ADMIN') return true; // Force master override for admins");

fs.writeFileSync('src/context/AuthContext.jsx', f);
console.log("Fixed hasPermission");
