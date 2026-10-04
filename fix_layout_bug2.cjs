const fs = require('fs');

let f = fs.readFileSync('src/components/Layout.jsx', 'utf8');

f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/"/g, '{hasPermission("dashboard") && (\n            <Link to="/"');
f = f.replace(/\{hasAccess\(\['ADMIN', 'CAJERO'\]\) && \(\s*<Link to="\/pos"/g, '{hasPermission("pos") && (\n            <Link to="/pos"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/menu"/g, '{hasPermission("menu") && (\n            <Link to="/menu"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/menu-dia"/g, '{hasPermission("menu_dia") && (\n            <Link to="/menu-dia"');
f = f.replace(/\{hasAccess\(\['ADMIN', 'COCINERO'\]\) && \(\s*<Link to="\/kds"/g, '{hasPermission("cocina") && (\n            <Link to="/kds"');
f = f.replace(/\{hasAccess\(\['ADMIN', 'CAJERO'\]\) && \(\s*<Link to="\/clientes"/g, '{hasPermission("clientes") && (\n            <Link to="/clientes"');
f = f.replace(/\{hasAccess\(\['ADMIN', 'CAJERO'\]\) && \(\s*<Link to="\/invoices"/g, '{hasPermission("facturas") && (\n            <Link to="/invoices"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/club"/g, '{hasPermission("club") && (\n            <Link to="/club"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/gastos"/g, '{hasPermission("gastos") && (\n            <Link to="/gastos"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/finanzas"/g, '{hasPermission("finanzas") && (\n            <Link to="/finanzas"');
f = f.replace(/\{hasAccess\(\['ADMIN'\]\) && \(\s*<Link to="\/colaboradores"/g, '{hasPermission("colaboradores") && (\n            <Link to="/colaboradores"');

fs.writeFileSync('src/components/Layout.jsx', f);
console.log("Fixed Layout hooks completely");
