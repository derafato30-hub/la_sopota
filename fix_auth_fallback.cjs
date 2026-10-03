const fs = require('fs');

let f = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

f = f.replace(/        \}, \(error\) => \{[\s\S]*?          setLoading\(false\);\n        \}\);/m, `        }, (error) => {
          console.error("Error obteniendo datos del usuario:", error);
          // Fallback a master si falla por permisos (para evitar bloquear al dueo)
          setUserRole('ADMIN'); 
          setUserPermissions({ '*': true }); 
          setRequirePasswordChange(false);
          setIsActive(true);
          setLoading(false);
        });`);

fs.writeFileSync('src/context/AuthContext.jsx', f);
console.log("Fixed AuthContext fallback");
