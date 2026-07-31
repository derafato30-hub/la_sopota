import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ShoppingCart, 
  Users, 
  Wallet,
  LogOut,
  ChefHat,
  Calendar,
  Receipt,
  UserCog
} from 'lucide-react';
import './Layout.css';

export default function Layout() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // Helper para verificar permisos
  const hasAccess = (allowedRoles) => {
    if (!userRole) return false;
    return allowedRoles.includes(String(userRole).trim().toUpperCase());
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <ChefHat size={24} color="var(--primary-color)" />
          <h2 style={{margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)'}}>La Sopota</h2>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <div className={`hamburger ${isSidebarOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      {/* Overlay para cerrar sidebar en móvil */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar Elegante */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <ChefHat size={32} color="var(--primary-color)" />
          <h2>La Sopota</h2>
        </div>
        
        <nav className="sidebar-nav">
          {hasAccess(['ADMIN']) && (
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
          )}

          {hasAccess(['ADMIN', 'CAJERO']) && (
            <Link to="/pos" className={`nav-item ${location.pathname === '/pos' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <ShoppingCart size={20} />
              <span>Punto de Venta</span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/menu" className={`nav-item ${location.pathname === '/menu' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <UtensilsCrossed size={20} />
              <span>Catálogo General</span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/menu-dia" className={`nav-item ${location.pathname === '/menu-dia' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <Calendar size={20} />
              <span>Armar Menú (Hoy)</span>
            </Link>
          )}

          {hasAccess(['ADMIN', 'COCINERO']) && (
            <Link to="/kds" className={`nav-item ${location.pathname === '/kds' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <ChefHat size={20} />
              <span>Cocina (KDS)</span>
            </Link>
          )}

          {hasAccess(['ADMIN', 'CAJERO']) && (
            <Link to="/clientes" className={`nav-item ${location.pathname === '/clientes' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <Users size={20} />
              <span>Clientes</span>
            </Link>
          )}

          {hasAccess(['ADMIN', 'CAJERO']) && (
            <Link to="/invoices" className={`nav-item ${location.pathname === '/invoices' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <Receipt size={20} />
              <span>Facturas</span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/gastos" className={`nav-item ${location.pathname === '/gastos' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <Wallet size={20} />
              <span>Gastos y Cierre</span>
            </Link>
          )}

          {hasAccess(['ADMIN']) && (
            <Link to="/colaboradores" className={`nav-item ${location.pathname === '/colaboradores' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <UserCog size={20} />
              <span>Colaboradores</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{currentUser?.email || 'Usuario'}</span>
            <span className="user-role">Rol: {userRole || 'Desconocido'}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
