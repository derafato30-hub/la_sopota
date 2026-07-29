import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqYBCXfTSur3FsdYwp5Vv-T1OKuR30wkk",
  authDomain: "adminlasopota.firebaseapp.com",
  projectId: "adminlasopota",
  storageBucket: "adminlasopota.firebasestorage.app",
  messagingSenderId: "620555206446",
  appId: "1:620555206446:web:ae00f1acae5a8de56544bf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const itemsToAdd = [
  // Sopas
  { name: 'Sopa de costilla de res', type: 'sopa', price: 150, available: true },
  { name: 'Sopa de capirotadas', type: 'sopa', price: 130, available: true },
  { name: 'Sopa de Mondongo', type: 'sopa', price: 150, available: true },
  { name: 'Sopa de gallina', type: 'sopa', price: 150, available: true },
  { name: 'Sopa de frijoles con costilla', type: 'sopa', price: 150, available: true },
  
  // Carnes (Menu del dia)
  { name: 'Pollo guisado', type: 'carne_menu_dia', price: 0, available: true },
  { name: 'Pechuga de pollo en crema de hongo', type: 'carne_menu_dia', price: 0, available: true },
  { name: 'Carne de res asada', type: 'carne_menu_dia', price: 0, available: true },
  
  // Acompañantes
  { name: 'Arroz blanco', type: 'acompanante', price: 0, available: true },
  { name: 'Arroz con vegetales', type: 'acompanante', price: 0, available: true },
  { name: 'Frijoles guisado', type: 'acompanante', price: 0, available: true },
  { name: 'Frijoles con queso', type: 'acompanante', price: 0, available: true },
  { name: 'Espagueti', type: 'acompanante', price: 0, available: true },
  { name: 'Papa al ajillo', type: 'acompanante', price: 0, available: true },
  { name: 'Ensalada verde', type: 'acompanante', price: 0, available: true },
  { name: 'Tajadas con chimol', type: 'acompanante', price: 0, available: true },
  
  // Platillos Personales
  { name: 'Costillas de Cerdo a la plancha BBQ', type: 'platillo', price: 180, available: true },
  { name: 'Costillas de Cerdo a la plancha con chimichurri', type: 'platillo', price: 180, available: true },
  { name: 'Chuleta a la plancha con chimichurri', type: 'platillo', price: 170, available: true },
  { name: 'Chuleta a la plancha BBQ', type: 'platillo', price: 170, available: true },
  { name: 'Pollo frito con tajadas - Pechuga Completa', type: 'platillo', price: 160, available: true },
  { name: 'Pollo frito con tajadas - Pierna Completa', type: 'platillo', price: 150, available: true },
  { name: 'Pollo frito con tajadas - Pechuga Media', type: 'platillo', price: 115, available: true },
  { name: 'Pollo frito con tajadas - Muslo Medio', type: 'platillo', price: 100, available: true },
  { name: 'Pollo frito con tajadas - Pierna Media', type: 'platillo', price: 90, available: true },
  { name: 'Alitas de pollo con papas - 6 alitas', type: 'platillo', price: 160, available: true },
  { name: 'Alitas de pollo con papas - 8 alitas', type: 'platillo', price: 210, available: true },
  { name: 'Alitas de pollo con papas - 12 alitas', type: 'platillo', price: 310, available: true },
  { name: 'Alitas de pollo con papas - 18 alitas', type: 'platillo', price: 430, available: true },
  { name: 'Alitas de pollo con papas - 24 alitas', type: 'platillo', price: 600, available: true },
  { name: 'Tacos de pollo con tajadas', type: 'platillo', price: 140, available: true },
  { name: 'Tacos de pollo con papas', type: 'platillo', price: 160, available: true },
  { name: 'Tacos de res con tajadas', type: 'platillo', price: 150, available: true },
  { name: 'Tacos de res con papas', type: 'platillo', price: 170, available: true },
  { name: 'Orden de 3 Enchiladas', type: 'platillo', price: 90, available: true },
  { name: 'Tajadas con carne molida', type: 'platillo', price: 90, available: true },
  { name: 'Pescado frito con tajadas', type: 'platillo', price: 200, available: true },
  
  // Combos Familiares
  { name: 'Combo de pollo (8pz + tajadas fam + ref. 2L)', type: 'combo', price: 450, available: true },
  { name: 'Combo Chuleta (8 medias chuletas + tajadas fam + ref. 2L)', type: 'combo', price: 580, available: true },
  { name: 'Combo 3 tacos de pollo con tajadas + ref. 2L', type: 'combo', price: 390, available: true },
  { name: 'Combo 3 tacos de pollo con papas + ref. 2L', type: 'combo', price: 450, available: true },
  
  // Salsas (Extras)
  { name: 'Salsa BBQ', type: 'extra', price: 15, available: true },
  { name: 'Salsa Honey Mustard', type: 'extra', price: 15, available: true },
  { name: 'Salsa Buffalo', type: 'extra', price: 15, available: true },
  { name: 'Salsa Sweet Chili', type: 'extra', price: 15, available: true },
  { name: 'Salsa BBQ honey garlic', type: 'extra', price: 15, available: true },
  { name: 'Salsa Mango habanero', type: 'extra', price: 15, available: true },
  { name: 'Salsa Garlic parmesan', type: 'extra', price: 15, available: true }
];

async function populateMenu() {
  console.log("Comenzando población del menú...");
  const menuRef = collection(db, 'menuItems');
  
  let count = 0;
  for (const item of itemsToAdd) {
    // Check if it already exists to avoid duplicates if run multiple times
    const q = query(menuRef, where("name", "==", item.name), where("type", "==", item.type));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(menuRef, item);
      console.log(`Agregado: ${item.name}`);
      count++;
    } else {
      console.log(`Ya existe: ${item.name}`);
    }
  }
  
  console.log(`\n¡Listo! Se agregaron ${count} platillos nuevos al menú.`);
  process.exit(0);
}

populateMenu().catch(err => {
  console.error(err);
  process.exit(1);
});
