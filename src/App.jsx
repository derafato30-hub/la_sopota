import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import MenuConfig from './pages/MenuConfig';
import MenuDelDiaConfig from './pages/MenuDelDiaConfig';
import POS from './pages/POS';
import KDS from './pages/KDS';
import Clientes from './pages/Clientes';
import Gastos from './pages/Gastos';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Colaboradores from './pages/Colaboradores';
import Finanzas from './pages/Finanzas';
import ClubCadetes from './pages/ClubCadetes/ClubCadetes';
import MigrateDB from './pages/MigrateDB';

// Componente para proteger rutas (Requiere Login y Permisos)
function ProtectedRoute({ children, moduleName }) {
  const { currentUser, requirePasswordChange, isActive, hasPermission } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />; 
  }

  if (isActive === false) {
    // Si la cuenta fue desactivada por el admin, devolver al login (deberamos cerrar sesin pero esto evita acceso al menos)
    return <Navigate to="/login" replace state={{ error: 'CUENTA_SUSPENDIDA' }} />;
  }

  // Si requiere cambio de contrasea y no est en la pgina de cambio
  if (requirePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Si no requiere cambio y est intentando acceder al cambio, mandarlo al inicio
  if (!requirePasswordChange && location.pathname === '/change-password') {
    return <Navigate to="/" replace />;
  }

  // Validacion de modulo (Granular Permissions)
  if (moduleName && !hasPermission(moduleName)) {
    // En lugar de redirigir a "/", mostramos un mensaje de Acceso Denegado para evitar loops infinitos
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-color)' }}>
        <h2>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No tienes permiso para ver este mdulo.</p>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Ruta pǧblica */}
          <Route path="/login" element={<Login />} />
          
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

          {/* Rutas Privadas con Layout Principal */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<ProtectedRoute moduleName="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="pos" element={<ProtectedRoute moduleName="pos"><POS /></ProtectedRoute>} />
            <Route path="menu" element={<ProtectedRoute moduleName="menu"><MenuConfig /></ProtectedRoute>} />
            <Route path="menu-dia" element={<ProtectedRoute moduleName="menu_dia"><MenuDelDiaConfig /></ProtectedRoute>} />
            <Route path="kds" element={<ProtectedRoute moduleName="cocina"><KDS /></ProtectedRoute>} />
            <Route path="clientes" element={<ProtectedRoute moduleName="clientes"><Clientes /></ProtectedRoute>} />
            <Route path="invoices" element={<ProtectedRoute moduleName="facturas"><Invoices /></ProtectedRoute>} />
            <Route path="gastos" element={<ProtectedRoute moduleName="gastos"><Gastos /></ProtectedRoute>} />
            <Route path="finanzas" element={<ProtectedRoute moduleName="finanzas"><Finanzas /></ProtectedRoute>} />
            <Route path="colaboradores" element={<ProtectedRoute moduleName="colaboradores"><Colaboradores /></ProtectedRoute>} />
            <Route path="club" element={<ProtectedRoute moduleName="club"><ClubCadetes /></ProtectedRoute>} />
            <Route path="migrar-db" element={<MigrateDB />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
