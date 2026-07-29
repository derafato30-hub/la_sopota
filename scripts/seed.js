import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';

import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedData = async () => {
  console.log('Iniciando borrado de base de datos...');
  const querySnapshot = await getDocs(collection(db, 'menuItems'));
  let deletedCount = 0;
  for (const document of querySnapshot.docs) {
    await deleteDoc(doc(db, 'menuItems', document.id));
    deletedCount++;
  }
  console.log(`Se eliminaron ${deletedCount} items antiguos.`);

  const newItems = [
    // --- Tradicionales ---
    {
      name: 'Pescado frito',
      type: 'platillo',
      hasVariations: true,
      variations: [
        { id: '1', name: 'Mediano (con tajadas o almuerzo)', price: 180 },
        { id: '2', name: 'Grande (con tajadas o almuerzo)', price: 200 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },
    {
      name: 'Costillas de Cerdo a la plancha',
      type: 'platillo',
      hasVariations: true,
      variations: [
        { id: '1', name: 'BBQ', price: 180 },
        { id: '2', name: 'Chimichurri', price: 180 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },
    {
      name: 'Chuleta a la plancha',
      type: 'platillo',
      hasVariations: true,
      variations: [
        { id: '1', name: 'BBQ', price: 170 },
        { id: '2', name: 'Chimichurri', price: 170 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },
    {
      name: 'Orden de 3 Enchiladas',
      type: 'platillo',
      hasVariations: false,
      variations: [],
      price: 90, stock: -1, available: true, description: ''
    },
    {
      name: 'Tajadas con carne molida',
      type: 'platillo',
      hasVariations: false,
      variations: [],
      price: 90, stock: -1, available: true, description: ''
    },

    // --- Pollo Frito ---
    {
      name: 'Pollo frito con tajadas (Porción Completa)',
      type: 'pollo_frito',
      hasVariations: true,
      variations: [
        { id: '1', name: 'Pechuga', price: 160 },
        { id: '2', name: 'Pierna', price: 150 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },
    {
      name: 'Pollo frito con tajadas (Media Porción)',
      type: 'pollo_frito',
      hasVariations: true,
      variations: [
        { id: '1', name: 'Pechuga', price: 115 },
        { id: '2', name: 'Muslo', price: 100 },
        { id: '3', name: 'Pierna', price: 90 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },

    // --- Tacos ---
    {
      name: 'Tacos de pollo',
      type: 'tacos',
      hasVariations: true,
      variations: [
        { id: '1', name: 'Con tajadas', price: 140 },
        { id: '2', name: 'Con papas', price: 160 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },

    // --- Alitas ---
    {
      name: 'Alitas de pollo con papas fritas',
      type: 'alitas',
      hasVariations: true,
      variations: [
        { id: '1', name: '6 alitas', price: 160 },
        { id: '2', name: '8 alitas', price: 210 },
        { id: '3', name: '12 alitas', price: 310 },
        { id: '4', name: '18 alitas', price: 430 },
        { id: '5', name: '24 alitas', price: 600 }
      ],
      price: 0, stock: -1, available: true, description: ''
    },

    // --- Salsas ---
    { name: 'BBQ', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Honey Mustard', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Buffalo', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Sweet Chili', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Bbq honey garlic', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Mango habanero', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Garlic parmesan', type: 'salsa_alitas', price: 0, stock: -1, hasVariations: false, variations: [], available: true },

    // --- Combos Familiares ---
    {
      name: 'Combo de pollo',
      type: 'combo',
      hasVariations: false,
      variations: [],
      price: 450, stock: -1, available: true,
      description: '8 piezas de pollo frito, 1 orden de tajadas familiar, 1 Refresco 2 Lts. Salsas, aderezo, repollo, chismol y encurtido.'
    },
    {
      name: 'Combo Chuleta',
      type: 'combo',
      hasVariations: false,
      variations: [],
      price: 580, stock: -1, available: true,
      description: '8 medias piezas chuletas, 1 orden de tajadas familiar, 1 Refresco 2 Lts. Salsas, aderezo, repollo, chismol y encurtido.'
    },
    {
      name: 'Combo de tacos',
      type: 'combo',
      hasVariations: true,
      variations: [
        { id: '1', name: 'Con tajadas (3 tacos)', price: 390 },
        { id: '2', name: 'Con papas (3 tacos)', price: 450 }
      ],
      price: 0, stock: -1, available: true,
      description: '3 tacos de pollo + refresco natural 2 lts'
    },

    // --- Menu del Día (Insumos Base) ---
    { name: 'Sopa de costilla de res', type: 'sopa', price: 150, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Sopa de frijoles con costilla', type: 'sopa', price: 150, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Carne de res asada', type: 'carne_menu_dia', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Arroz', type: 'acompanante', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Tajadas con chimol', type: 'acompanante', price: 0, stock: -1, hasVariations: false, variations: [], available: true },
    { name: 'Frijoles con queso', type: 'acompanante', price: 0, stock: -1, hasVariations: false, variations: [], available: true }
  ];

  for (const item of newItems) {
    await addDoc(collection(db, 'menuItems'), item);
  }
  
  console.log(`Se insertaron ${newItems.length} items en la base de datos con éxito.`);
  process.exit(0);
};

seedData().catch((err) => {
  console.error("Error al poblar BD:", err);
  process.exit(1);
});
