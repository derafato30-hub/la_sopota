const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// The file currently has multiple broken fragments. 
// We know that everything after the last `Guardar Cliente</button>` block up to the end is just the `div`, `);`, `}`.
// Let's find exactly the end of that form.
const marker = 'Guardar Cliente</button>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      )}';
const index = f.lastIndexOf('Guardar Cliente</button>');

if (index !== -1) {
    // Find the end of the setShowNewCustomerForm block
    let endOfBlock = f.indexOf(')}', index);
    endOfBlock += 2; // include ')}'
    
    // Everything from here to the end should be replaced
    f = f.substring(0, endOfBlock);

    // Append exactly what is needed
    f += `\r\n\r\n      {/* SUPER ADMIN MODAL */}\r\n      {superAuthAction && (\r\n        <SuperAdminAuthModal\r\n          currentUser={currentUser}\r\n          onCancel={() => setSuperAuthAction(null)}\r\n          onSuccess={() => {\r\n            if (superAuthAction.type === 'EDIT_ORDER') {\r\n              handleEditOrder(superAuthAction.order);\r\n            } else if (superAuthAction.type === 'EDIT_PAYMENT') {\r\n              setPaymentModalOrder(superAuthAction.order);\r\n            }\r\n            setSuperAuthAction(null);\r\n          }}\r\n        />\r\n      )}\r\n    </div>\r\n  );\r\n}\r\n`;
    
    fs.writeFileSync('src/pages/POS.jsx', f);
    console.log('Fixed completely!');
} else {
    console.log('Could not find marker');
}
