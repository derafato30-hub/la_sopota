const fs = require('fs');
const path = 'src/pages/Finanzas.jsx';
let f = fs.readFileSync(path, 'utf8');
f = f.replace(/from 'firebase\/firestore';/, ", limit } from 'firebase/firestore';");
fs.writeFileSync(path, f, 'utf8');
