const fs = require('fs');

let f = fs.readFileSync('src/components/TwoFactorSetupModal.jsx', 'utf8');

f = f.replace(/useEffect\(\(\) => \{/, `useEffect(() => {
    console.log('TwoFactorSetupModal mounted!');
    try {`);
    
f = f.replace(/    \}\);\n  \}, \[currentUser\]\);/, `    });
    } catch(err) {
      console.error('Error in TwoFactorSetupModal useEffect:', err);
      toast.error('Error inicializando OTP. Revisa la consola.');
    }
  }, [currentUser]);`);

fs.writeFileSync('src/components/TwoFactorSetupModal.jsx', f);
console.log('Added try/catch');
