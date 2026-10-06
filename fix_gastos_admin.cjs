const fs = require('fs');
let f = fs.readFileSync('src/pages/Gastos.jsx', 'utf8');

// 1. Destructure hasPermission
f = f.replace(/const \{ currentUser, userRole \} = useAuth\(\);/, 'const { currentUser, userRole, hasPermission } = useAuth();');

// 2. Update the logic for isAdmin
const isAdminLogic = "const isAdmin = userRole === 'ADMIN' || userRole === 'admin' || hasPermission('*') || hasPermission('SUPERUSUARIO');";

// 3. Fix Gastos filter
f = f.replace(/if \(userRole !== 'ADMIN' && g\.createdBy !== currentUser\.uid\) return false;/,
`${isAdminLogic}\n          if (!isAdmin && g.createdBy !== currentUser.uid) return false;`);

// 4. Fix Cierres filter
f = f.replace(/if \(userRole !== 'ADMIN'\) \{/,
`${isAdminLogic}\n        if (!isAdmin) {`);

fs.writeFileSync('src/pages/Gastos.jsx', f);
console.log('Fixed Gastos admin logic');
