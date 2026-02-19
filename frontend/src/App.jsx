import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import { useTenant } from './hooks/useTenant';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Platform Pages (sense tenant - landing de MatchCota)
// [DEV] En producció, la landing de MatchCota i les apps de protectores
// seran aplicacions/dominis completament separats. Aquí les unim
// per facilitar el desenvolupament local.
import Landing from './pages/platform/Landing';
import RegisterTenant from './pages/public/RegisterTenant';

// Tenant Pages (amb tenant - app de la protectora)
import Home from './pages/public/Home';
import Animals from './pages/public/Animals';
import AnimalDetail from './pages/public/AnimalDetail';
import Login from './pages/public/Login';
import RegisterAnimal from './pages/public/RegisterAnimal';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';

/**
 * [DEV] Routing condicional basat en si hi ha tenant actiu o no.
 *
 * - Sense tenant (localhost:5173): Mostra la landing de la plataforma MatchCota
 *   amb la llista de protectores i el formulari d'onboarding.
 *
 * - Amb tenant (localhost:5173/?tenant=slug o slug.matchcota.com): Mostra
 *   l'aplicació de la protectora (animals, test, admin, etc.).
 *
 * [PROD] A AWS, això no existirà. matchcota.com serà una app estàtica (S3+CloudFront)
 * i cada slug.matchcota.com serà l'app React de la protectora, amb el tenant
 * resolt pel subdomini i una Lambda que crea els subdominis durant l'onboarding.
 */
function AppRoutes() {
  const { tenant, loading } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregant...</p>
        </div>
      </div>
    );
  }

  // [DEV] Sense tenant → Landing de plataforma MatchCota
  if (!tenant) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register-tenant" element={<RegisterTenant />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Amb tenant → App de la protectora
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="animals" element={<Animals />} />
          <Route path="animals/:id" element={<AnimalDetail />} />
          <Route path="login" element={<Login />} />
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
    </AuthProvider>
  );
}

function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;
