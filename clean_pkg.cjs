const fs = require('fs');

let f = fs.readFileSync('package.json', 'utf8');
f = f.replace(/"otplib": "\^13\.5\.0",\s*/, "");
f = f.replace(/"vite-plugin-node-polyfills": "\^0\.28\.0"/, '"vite-plugin-node-polyfills": "^0.28.0"'); // wait, I'll just leave it if it's there or remove it.
f = f.replace(/,\s*"vite-plugin-node-polyfills": "\^0\.28\.0"/, "");
fs.writeFileSync('package.json', f);
console.log('Cleaned package.json');
