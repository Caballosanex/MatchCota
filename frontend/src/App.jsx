import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/public/Home';
import Animals from './pages/public/Animals';
import AnimalDetail from './pages/public/AnimalDetail';
import Login from './pages/public/Login';
import RegisterTenant from './pages/public/RegisterTenant';
import RegisterAnimal from './pages/public/RegisterAnimal';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="animals" element={<Animals />} />
              <Route path="animals/:id" element={<AnimalDetail />} />
              <Route path="login" element={<Login />} />

              {/* Mantinc les rutes existents tot i que potser haurien d'estar organitzades diferent */}
              <Route path="register-tenant" element={<RegisterTenant />} />
              <Route path="register-animal" element={<RegisterAnimal />} />

              {/* Placeholder per Test de Compatibilitat */}
              <Route path="test" element={<div className="p-8">Test de Compatibilitat (Pendent)</div>} />
            </Route>

            {/* Admin Routes (Protected) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<Dashboard />} />

              {/* Placeholders per altres rutes admin */}
              <Route path="animals" element={<div className="p-8">Gestió Animals (Pendent)</div>} />
              <Route path="leads" element={<div className="p-8">Leads (Pendent)</div>} />
              <Route path="settings" element={<div className="p-8">Configuració (Pendent)</div>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<div className="p-8">Pàgina no trobada</div>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;