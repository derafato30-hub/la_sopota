const fs = require('fs');
let f = fs.readFileSync('src/pages/POS.jsx', 'utf8');

f = f.replace(/} catch\(e\) { console.error\(e\); } finally { setIsProcessingPayment\(false\); }/, `} catch(e) { console.error(e); toast.error('Error: ' + e.message); } finally { setIsProcessingPayment(false); }`);

fs.writeFileSync('src/pages/POS.jsx', f, 'utf8');
console.log('Added toast error');
