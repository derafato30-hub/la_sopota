import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqYBCXfTSur3FsdYwp5Vv-T1OKuR30wkk",
  authDomain: "adminlasopota.firebaseapp.com",
  projectId: "adminlasopota",
  storageBucket: "adminlasopota.firebasestorage.app",
  messagingSenderId: "620555206446",
  appId: "1:620555206446:web:ae00f1acae5a8de56544bf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  const email = "admin@lasopota.com";
  const password = "sopotaadmin123";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User created:", user.uid);
    
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      role: 'admin',
      name: 'Admin La Sopota',
      createdAt: serverTimestamp()
    });
    console.log("User document created in Firestore.");
    console.log(`\n¡ÉXITO!\nCorreo: ${email}\nContraseña: ${password}`);
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
       console.log("El usuario admin@lasopota.com ya existe. Por seguridad no puedo ver su contraseña, pero puedo crear otro.");
       try {
           const email2 = "admin2@lasopota.com";
           const userCredential2 = await createUserWithEmailAndPassword(auth, email2, password);
           await setDoc(doc(db, "users", userCredential2.user.uid), {
             email: email2,
             role: 'admin',
             name: 'Admin 2',
             createdAt: serverTimestamp()
           });
           console.log(`\n¡ÉXITO!\nCorreo: ${email2}\nContraseña: ${password}`);
           process.exit(0);
       } catch (err) {
           console.error("Error creando el segundo admin:", err);
           process.exit(1);
       }
    } else {
       console.error("Error creating user:", error);
       process.exit(1);
    }
  }
}

createAdmin();
