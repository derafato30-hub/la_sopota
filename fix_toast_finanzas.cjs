const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');
f = f.replace(/import \{ toast \} from 'react-hot-toast';/, "import { toast } from 'sonner';");
fs.writeFileSync('src/pages/Finanzas.jsx', f);
console.log('Fixed import');
