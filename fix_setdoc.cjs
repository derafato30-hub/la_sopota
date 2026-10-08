const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

f = f.replace(/import \{ collection, query, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, where, runTransaction \} from 'firebase\/firestore';/, 
"import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, setDoc, serverTimestamp, onSnapshot, where, runTransaction } from 'firebase/firestore';");

fs.writeFileSync('src/pages/Finanzas.jsx', f);
console.log('Fixed import setDoc');
