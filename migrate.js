import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, doc, setDoc } from "firebase/firestore";

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

const prodApp = initializeApp(prodConfig, "prod");
const prodDb = getFirestore(prodApp);

const devApp = initializeApp(devConfig, "dev");
const devDb = getFirestore(devApp);

async function copyCollection(colName) {
  console.log(`Copying ${colName}...`);
  try {
    const snap = await getDocs(collection(prodDb, colName));
    if (snap.empty) {
      console.log(`- ${colName} is empty in PROD.`);
      return;
    }
    
    let count = 0;
    for (const d of snap.docs) {
      await setDoc(doc(devDb, colName, d.id), d.data());
      count++;
    }
    console.log(`- Copied ${count} documents for ${colName}`);
  } catch (e) {
    console.error(`Error copying ${colName}:`, e.message);
  }
}

async function run() {
  console.log("Starting copy...");
  await copyCollection("menuItems");
  await copyCollection("categories");
  await copyCollection("variations");
  await copyCollection("clients");
  await copyCollection("customers"); 
  await copyCollection("menu"); // If it's used
  console.log("Finished copy.");
  process.exit(0);
}

run();
