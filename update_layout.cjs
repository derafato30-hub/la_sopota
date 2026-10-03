const fs = require('fs');

let f = fs.readFileSync('src/components/Layout.jsx', 'utf8');

// Replace hasAccess definitions and imports
f = f.replace(/const { currentUser, userRole } = useAuth\(\);/, 'const { currentUser, userRole, hasPermission } = useAuth();');

// Remove hasAccess helper
f = f.replace(/  \/\/ Helper para verificar permisos[\s\S]*?  return \(/, '  return (');

// Update conditions
f = f.replace(/\{hasAccess\(\['ADMIN'\]\)\}/g, '{hasPermission("dashboard")}');
f = f.replace(/\{hasAccess\(\['ADMIN', 'CAJERO'\]\)\}/g, '{hasPermission("pos")}');
// Adjust specific ones manually
f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/menu"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("menu") && (\n            <Link to="/menu" className={`nav-item ${location.pathname === \'/menu\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <UtensilsCrossed size={20} />\n              <span>Catlogo General</span>\n            </Link>\n          )}');
f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/menu-dia"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("menu_dia") && (\n            <Link to="/menu-dia" className={`nav-item ${location.pathname === \'/menu-dia\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <Calendar size={20} />\n              <span>Armar Men (Hoy)</span>\n            </Link>\n          )}');
f = f.replace(/\{hasAccess\(\['ADMIN', 'COCINERO'\]\)\}/g, '{hasPermission("cocina")}');
f = f.replace(/\{hasPermission\("pos"\) && \([\s\S]*?<Link to="\/clientes"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("clientes") && (\n            <Link to="/clientes" className={`nav-item ${location.pathname === \'/clientes\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <Users size={20} />\n              <span>Clientes</span>\n            </Link>\n          )}');
f = f.replace(/\{hasPermission\("pos"\) && \([\s\S]*?<Link to="\/invoices"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("facturas") && (\n            <Link to="/invoices" className={`nav-item ${location.pathname === \'/invoices\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <Receipt size={20} />\n              <span>Facturas</span>\n            </Link>\n          )}');

f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/club"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("club") && (\n            <Link to="/club" className={`nav-item ${location.pathname === \'/club\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <Shield size={20} />\n              <span>Club de Cadetes</span>\n            </Link>\n          )}');

f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/gastos"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("gastos") && (\n            <Link to="/gastos" className={`nav-item ${location.pathname === \'/gastos\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <Wallet size={20} />\n              <span>Gastos y Cierre</span>\n            </Link>\n          )}');

f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/finanzas"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("finanzas") && (\n            <Link to="/finanzas" className={`nav-item ${location.pathname === \'/finanzas\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <TrendingUp size={20} />\n              <span style={{display: \'flex\', flexDirection: \'column\'}}>\n                <span>Finanzas</span>\n                <span style={{fontSize: \'0.7rem\', color: \'#ffb74d\'}}>En construccin</span>\n              </span>\n            </Link>\n          )}');

f = f.replace(/\{hasPermission\("dashboard"\) && \([\s\S]*?<Link to="\/colaboradores"[\s\S]*?<\/Link>\n          \)\}/, '{hasPermission("colaboradores") && (\n            <Link to="/colaboradores" className={`nav-item ${location.pathname === \'/colaboradores\' ? \'active\' : \'\'}`} onClick={() => setIsSidebarOpen(false)}>\n              <UserCog size={20} />\n              <span>Colaboradores</span>\n            </Link>\n          )}');


fs.writeFileSync('src/components/Layout.jsx', f);
console.log("Updated layout permissions");
