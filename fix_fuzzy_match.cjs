const fs = require('fs');

let f = fs.readFileSync('src/pages/ClubCadetes/IngresoTab.jsx', 'utf8');

// 1. Add the helper function after the imports
const helperFn = `
const findBestDishMatch = (raw, items) => {
  if (!raw) return null;
  const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\\b(de|con|la|el|los|las|y)\\b/g, " ").replace(/\\s+/g, " ").trim();
  
  const rawNorm = normalize(raw);
  const rawWords = rawNorm.split(" ").filter(Boolean);
  
  let bestMatch = null;
  let bestScore = 0;

  for (const item of items) {
    const itemNorm = normalize(item.name);
    if (itemNorm === rawNorm) return item; // Exact match

    const itemWords = itemNorm.split(" ").filter(Boolean);
    let score = 0;
    
    itemWords.forEach(iw => {
      // Check for singular/plural or exact match
      if (rawWords.some(rw => rw.startsWith(iw) || iw.startsWith(rw))) {
        score++;
      }
    });

    // We want at least some words to match. 
    // The more words match, the better.
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // Threshold: at least 1 meaningful word must match
  return bestScore > 0 ? bestMatch : null;
};
`;

if (!f.includes("const findBestDishMatch")) {
  f = f.replace("const YEARS =", helperFn + "\nconst YEARS =");
}

// 2. Replace the strict find with the new helper
f = f.replace(/const matchDish = menuItems\.find\(m => m\.name\.toLowerCase\(\) === rawDish\.toLowerCase\(\)\);/g, "const matchDish = findBestDishMatch(rawDish, menuItems);");
f = f.replace(/const matchDish = menuItems\.find\(m => m\.name\.toLowerCase\(\) === \(item\.dishName \|\| ''\)\.toLowerCase\(\)\);/g, "const matchDish = findBestDishMatch(item.dishName, menuItems);");


fs.writeFileSync('src/pages/ClubCadetes/IngresoTab.jsx', f);
console.log("Fuzzy match injected.");
