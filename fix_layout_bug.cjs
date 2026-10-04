const fs = require('fs');

let f = fs.readFileSync('src/components/Layout.jsx', 'utf8');

f = f.replace(/hasAccess\(\['ADMIN'\]\)/g, 'hasPermission("dashboard")');
f = f.replace(/hasAccess\(\['ADMIN', 'CAJERO'\]\)/g, 'hasPermission("pos")');
f = f.replace(/hasAccess\(\['ADMIN', 'COCINERO'\]\)/g, 'hasPermission("cocina")');

// Wait, some links might have the same permission, let's ensure we fix all of them!
// Let's just fix everything to use hasPermission.

f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/menu"/, 'hasPermission("menu") && (\n            <Link to="/menu"');
f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/menu-dia"/, 'hasPermission("menu_dia") && (\n            <Link to="/menu-dia"');
f = f.replace(/hasPermission\("pos"\) && \([\s\S]*?<Link to="\/clientes"/, 'hasPermission("clientes") && (\n            <Link to="/clientes"');
f = f.replace(/hasPermission\("pos"\) && \([\s\S]*?<Link to="\/invoices"/, 'hasPermission("facturas") && (\n            <Link to="/invoices"');
f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/club"/, 'hasPermission("club") && (\n            <Link to="/club"');
f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/gastos"/, 'hasPermission("gastos") && (\n            <Link to="/gastos"');
f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/finanzas"/, 'hasPermission("finanzas") && (\n            <Link to="/finanzas"');
f = f.replace(/hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/colaboradores"/, 'hasPermission("colaboradores") && (\n            <Link to="/colaboradores"');

fs.writeFileSync('src/components/Layout.jsx', f);
console.log("Fixed Layout hooks");
