const fs = require('fs');
let f = fs.readFileSync('src/utils/aiService.js', 'utf8');
f = f.replace(/gemini-1\.5-flash/g, 'gemini-flash-latest');
fs.writeFileSync('src/utils/aiService.js', f);
console.log("Fixed model name");
