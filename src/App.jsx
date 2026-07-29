import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import MenuConfig from './pages/MenuConfig';
import MenuDelDiaConfig from './pages/MenuDelDiaConfig';
import POS from './pages/POS';
import KDS from './pages/KDS';
import Clientes from './pages/Clientes';
import Gastos from './pages/Gastos';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Colaboradores from './pages/Colaboradores';

// Componente para proteger rutas (Requiere Login)
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />; 
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas Privadas con Layout Principal */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="menu" element={<MenuConfig />} />
            <Route path="menu-dia" element={<MenuDelDiaConfig />} />
            <Route path="kds" element={<KDS />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="gastos" element={<Gastos />} />
            <Route path="colaboradores" element={<Colaboradores />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
