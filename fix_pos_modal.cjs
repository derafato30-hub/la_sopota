const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

const modalStr = `
      {/* SUPER ADMIN MODAL */}
      {superAuthAction && (
        <SuperAdminAuthModal
          currentUser={currentUser}
          onCancel={() => setSuperAuthAction(null)}
          onSuccess={() => {
            if (superAuthAction.type === 'EDIT_ORDER') {
              handleEditOrder(superAuthAction.order);
            } else if (superAuthAction.type === 'EDIT_PAYMENT') {
              setPaymentModalOrder(superAuthAction.order);
            }
            setSuperAuthAction(null);
          }}
        />
      )}
    </div>
  );
}`;

// Make it super robust
f = f.replace(/    <\/div>\r?\n  \);\r?\n\}\r?\n?$/, modalStr);
// Fallback if not exactly 4 spaces
f = f.replace(/<\/div>\r?\n\s*\);\r?\n\}\r?\n?$/, modalStr);

fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Fixed POS modal render');
