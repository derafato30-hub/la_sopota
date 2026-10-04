const fs = require('fs');
let f = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
f = f.replace(/import \{ collection, query, where, getDocs, doc, deleteDoc \} from 'firebase\/firestore';/, "import { collection, query, where, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';");
fs.writeFileSync('src/pages/Dashboard.jsx', f);
