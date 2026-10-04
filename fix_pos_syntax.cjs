const fs = require('fs');

let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

// 1. Remove duplicate import of useAuth
f = f.replace(/import \{ useAuth \} from '\.\.\/context\/AuthContext';\r?\nimport \{ useAuth \} from '\.\.\/context\/AuthContext';/, "import { useAuth } from '../context/AuthContext';");
f = f.replace(/import \{ toast \} from 'sonner';\r?\nimport SuperAdminAuthModal from '\.\.\/components\/SuperAdminAuthModal';\r?\nimport \{ useAuth \} from '\.\.\/context\/AuthContext';/, "import { toast } from 'sonner';\nimport SuperAdminAuthModal from '../components/SuperAdminAuthModal';");

// 2. Fix duplicate declaration of currentUser
f = f.replace(/const \{ currentUser \} = useAuth\(\);/, "const { currentUser, hasPermission } = useAuth();");
f = f.replace(/const \{ currentUser, hasPermission \} = useAuth\(\);\s*const \{ currentUser, hasPermission \} = useAuth\(\);/, "const { currentUser, hasPermission } = useAuth();");
f = f.replace(/const \[superAuthAction, setSuperAuthAction\] = useState\(null\);\s*const \{ currentUser, hasPermission \} = useAuth\(\);/, "const [superAuthAction, setSuperAuthAction] = useState(null);");

fs.writeFileSync('src/pages/POS.jsx', f);
console.log('Fixed POS.jsx syntax error');
