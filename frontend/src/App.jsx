import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
              <Route path="register-tenant" element={<RegisterTenant />} />
              <Route path="register-animal" element={<RegisterAnimal />} />
              <Route path="test" element={<div className="p-8 text-center text-gray-500">Test de Compatibilitat (Sprint 5)</div>} />
            </Route>

            {/* Admin Routes (Protected) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="animals" element={<div className="p-8">Gestio Animals (Sprint 4)</div>} />
              <Route path="animals/new" element={<RegisterAnimal />} />
              <Route path="leads" element={<div className="p-8">Leads (Sprint 7)</div>} />
              <Route path="settings" element={<div className="p-8">Configuracio (Pendent)</div>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                  <p className="text-gray-500">Pagina no trobada</p>
                </div>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
