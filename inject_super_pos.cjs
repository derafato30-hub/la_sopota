const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// Add import
f = f.replace(/import \{ toast \} from 'sonner';/, "import { toast } from 'sonner';\nimport SuperAdminAuthModal from '../components/SuperAdminAuthModal';\nimport { useAuth } from '../context/AuthContext';");

// Add state for auth
f = f.replace(/const \[clientInfoData, setClientInfoData\] = useState\(null\);/, "const [clientInfoData, setClientInfoData] = useState(null);\n  const [superAuthAction, setSuperAuthAction] = useState(null);\n  const { currentUser, hasPermission } = useAuth();");

// Add buttons in Columna 5
// Find Columna 5 items rendering
const findStr = `{o.invoiceId && <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Fac: {o.invoiceId}</div>}`;
const replaceStr = `{o.invoiceId && <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Fac: {o.invoiceId}</div>}
                  {hasPermission('SUPERUSUARIO') && (
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                      <button className="btn-secondary" style={{flex: 1, padding: '0.4rem', border: '1px solid #FF9800', color: '#FF9800'}} onClick={() => setSuperAuthAction({ type: 'EDIT_ORDER', order: o })}>Editar Orden</button>
                      <button className="btn-secondary" style={{flex: 1, padding: '0.4rem', border: '1px solid #4CAF50', color: '#4CAF50'}} onClick={() => setSuperAuthAction({ type: 'EDIT_PAYMENT', order: o })}>Editar Pago</button>
                    </div>
                  )}`;
f = f.replace(findStr, replaceStr);

// Add Modal render at the very end before closing div
const modalStr = `
        {superAuthAction && (
          <SuperAdminAuthModal
            currentUser={currentUser}
            onCancel={() => setSuperAuthAction(null)}
            onSuccess={() => {
              if (superAuthAction.type === 'EDIT_ORDER') {
                handleEditOrder(superAuthAction.order);
              } else if (superAuthAction.type === 'EDIT_PAYMENT') {
                setPaymentModalOrder(superAuthAction.order);
                // Also prepopulate splitPayments if needed, but payment modal handles it gracefully
              }
              setSuperAuthAction(null);
            }}
          />
        )}
      </div>
    );
`;
f = f.replace(/      <\/div>\r?\n    \);\r?\n  \}\s*$/, modalStr);

fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Added Superuser features to POS');
