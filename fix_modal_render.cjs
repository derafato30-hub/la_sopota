const fs = require('fs');

let f = fs.readFileSync('src/pages/Colaboradores.jsx', 'utf8');

const modalJSX = `
      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <TwoFactorSetupModal 
          currentUser={currentUser}
          onCancel={() => setShow2FAModal(false)}
          onComplete={(secret) => {
            setShow2FAModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}`;

f = f.replace(/    <\/div>\r?\n  \);\r?\n\}/, modalJSX);

fs.writeFileSync('src/pages/Colaboradores.jsx', f);
console.log('Fixed missing modal render');
