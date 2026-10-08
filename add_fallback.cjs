const fs = require('fs');
let f = fs.readFileSync('src/pages/Finanzas.jsx', 'utf8');

const oldTry = `
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const accountsList = accounts.filter(a => a.type !== 'PAYABLE').map(a => ({ id: a.id, name: a.name }));`;

const newTry = `
      // Intentamos con el modelo más rápido primero, y tenemos un plan B (fallback) si los servidores están saturados
      let model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: { responseMimeType: "application/json" } 
      });

      const accountsList = accounts.filter(a => a.type !== 'PAYABLE').map(a => ({ id: a.id, name: a.name }));`;

const oldResult = `      const result = await model.generateContent(prompt);`;
const newResult = `      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (err) {
        if (err.message && err.message.includes('503')) {
          console.warn('Servidores de Google saturados (503). Intentando con el modelo de respaldo (gemini-pro-latest)...');
          model = genAI.getGenerativeModel({ 
            model: "gemini-pro-latest", 
            generationConfig: { responseMimeType: "application/json" } 
          });
          result = await model.generateContent(prompt);
        } else {
          throw err;
        }
      }`;

f = f.replace(oldTry, newTry);
f = f.replace(oldResult, newResult);

fs.writeFileSync('src/pages/Finanzas.jsx', f, 'utf8');
console.log('Fixed model fallback');
