const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Remove all injected modals
f = f.replace(/\{\/\* SUPER ADMIN MODAL \*\/\}[\s\S]*?<\/SuperAdminAuthModal>\r?\n\s*\)\}/g, '');
f = f.replace(/onCancel=\{\(\) => setSuperAuthAction\(null\)\}[\s\S]*?<\/SuperAdminAuthModal>\r?\n\s*\)\}/g, ''); // catch fragments
f = f.replace(/<SuperAdminAuthModal[\s\S]*?\/>\r?\n\s*\)\}/g, '');

const cleanTail = `
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

f = f.replace(/<\/div>\r?\n\s*\);\r?\n\}\s*$/, cleanTail);

fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Fixed POS tail completely');
