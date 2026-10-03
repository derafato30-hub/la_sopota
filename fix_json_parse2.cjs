const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

const regex = /const newDrafts = resultJson\.map\(item => \{[\s\S]*?hasError: !matchDish[\s\S]*?\};[\s\S]*?\}\);/g;
const replaceWith = `const newDrafts = resultJson.map(item => {
          const rawName = item.cadetName || item.nombre || item.apellido || item.cadete || item.name || 'Desconocido';
          let rawYear = String(item.year || item.año || item.ano || item.curso || 'Extra').toLowerCase();
          const rawDish = String(item.dishName || item.pedido || item.platillo || item.comida || item.plato || 'Desconocido');

          let finalYear = 'Extra';
          if (rawYear.includes('1') || rawYear.includes('i ') || rawYear === 'i' || rawYear.includes('primero')) finalYear = 'I año';
          else if (rawYear.includes('2') || rawYear.includes('ii ') || rawYear === 'ii' || rawYear.includes('segundo')) finalYear = 'II año';
          else if (rawYear.includes('3') || rawYear.includes('iii ') || rawYear === 'iii' || rawYear.includes('tercero')) finalYear = 'III año';
          else if (rawYear.includes('4') || rawYear.includes('iv ') || rawYear === 'iv' || rawYear.includes('cuarto')) finalYear = 'IV año';

          const matchDish = menuItems.find(m => m.name.toLowerCase() === rawDish.toLowerCase());

          return {
            id: Date.now().toString() + Math.random(),
            cadetName: rawName.toUpperCase(),
            year: finalYear,
            dishId: matchDish ? matchDish.id : '', 
            dishName: matchDish ? matchDish.name : rawDish,
            price: matchDish ? matchDish.price : 0,
            status: 'PENDING',
            hasError: !matchDish 
          };
        });`;

f = f.replace(regex, replaceWith);

fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Updated parsing logic correctly");
