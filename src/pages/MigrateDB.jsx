import { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection, doc, setDoc } from "firebase/firestore";
import { toast } from 'sonner';

// Configuraciones hardcodeadas para la migración
const prodConfig = {
  apiKey: "AIzaSyDqYBCXfTSur3FsdYwp5Vv-T1OKuR30wkk",
  authDomain: "adminlasopota.firebaseapp.com",
  projectId: "adminlasopota",
  storageBucket: "adminlasopota.firebasestorage.app",
  messagingSenderId: "620555206446",
  appId: "1:620555206446:web:ae00f1acae5a8de56544bf"
};

const devConfig = {
  apiKey: "AIzaSyA-05DjyZ8hEbL3UqGH5IFDo7wPbDkaskg",
  authDomain: "lasopotadev.firebaseapp.com",
  projectId: "lasopotadev",
  storageBucket: "lasopotadev.firebasestorage.app",
  messagingSenderId: "618693315167",
  appId: "1:618693315167:web:81f22db6fbdb07022aa9ea"
};

export default function MigrateDB() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMigrate = async () => {
    if (!email || !password) return toast.error("Ingresa tu correo y contraseña de admin");
    setLoading(true);
    setStatus('Iniciando apps...');
    try {
      // 1. Initialize Apps
      const prodApp = initializeApp(prodConfig, "prod_migrate");
      const devApp = initializeApp(devConfig, "dev_migrate");
      
      const prodAuth = getAuth(prodApp);
      const devAuth = getAuth(devApp);
      
      const prodDb = getFirestore(prodApp);
      const devDb = getFirestore(devApp);

      // 2. Login in both
      setStatus('Autenticando en Producción...');
      await signInWithEmailAndPassword(prodAuth, email, password);
      
      setStatus('Autenticando en Pruebas...');
      try {
        await signInWithEmailAndPassword(devAuth, email, password);
      } catch (e) {
        console.warn("Fallo login en dev, asumiendo reglas publicas o cuenta no existe", e);
      }

      // 3. Migrate collections
      const collectionsToCopy = ['menuItems', 'categories', 'variations', 'clients'];
      
      for (const colName of collectionsToCopy) {
        setStatus(`Copiando ${colName}...`);
        const snap = await getDocs(collection(prodDb, colName));
        let count = 0;
        for (const d of snap.docs) {
          await setDoc(doc(devDb, colName, d.id), d.data());
          count++;
        }
        console.log(`Copiados ${count} de ${colName}`);
      }

      setStatus('¡Migración completada con éxito!');
      toast.success("Base de datos de pruebas actualizada.");
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
      toast.error("Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center'}}>
      <h2>Clonar Base de Datos</h2>
      <p style={{color: 'gray', marginBottom: '2rem'}}>
        Esta herramienta copiará el Menú, Categorías y Clientes de <strong>Producción</strong> hacia el entorno de <strong>Pruebas</strong>. No se copiarán órdenes ni ventas.
      </p>

      <div className="form-group" style={{textAlign: 'left'}}>
        <label>Correo Electrónico (Admin)</label>
        <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="form-group" style={{textAlign: 'left'}}>
        <label>Contraseña</label>
        <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <button className="btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={handleMigrate} disabled={loading}>
        {loading ? 'Copiando...' : 'Iniciar Clonación'}
      </button>

      {status && <p style={{marginTop: '1rem', fontWeight: 'bold'}}>{status}</p>}
    </div>
  );
}
