import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import Landing from './pages/platform/Landing';
import Home from './pages/public/Home';
import Animals from './pages/public/Animals';
import AnimalDetail from './pages/public/AnimalDetail';
import Login from './pages/public/Login';
import RegisterTenant from './pages/public/RegisterTenant';
import MatchTest from './pages/public/MatchTest';
import MatchResults from './pages/public/MatchResults';
import Dashboard from './pages/admin/Dashboard';
import AnimalsManager from './pages/admin/AnimalsManager';
import AnimalCreate from './pages/admin/AnimalCreate';
import AnimalEdit from './pages/admin/AnimalEdit';
import {
  resolveHostContext,
  isApexTenantPathBlocked,
  isTenantRegistrationBlocked,
} from './routing/hostRouting';

function GuardedRoot() {
  const hostContext = resolveHostContext();

  if (hostContext.isTenantHost) {
    return <Home />;
  }

  return <Landing />;
}

function ApexTenantRouteGuard({ children }) {
  const hostContext = resolveHostContext();
  const pathname = window.location.pathname;

  if (hostContext.isApexHost && isApexTenantPathBlocked(pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function TenantRegistrationGuard() {
  const hostContext = resolveHostContext();
  const pathname = window.location.pathname;

  if (hostContext.isTenantHost && isTenantRegistrationBlocked(pathname)) {
    return <Navigate to="/" replace />;
  }

  return <RegisterTenant />;
}

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<GuardedRoot />} />
              <Route
                path="home"
                element={(
                  <ApexTenantRouteGuard>
                    <Home />
                  </ApexTenantRouteGuard>
                )}
              />
              <Route
                path="animals"
                element={(
                  <ApexTenantRouteGuard>
                    <Animals />
                  </ApexTenantRouteGuard>
                )}
              />
              <Route
                path="animals/:id"
                element={(
                  <ApexTenantRouteGuard>
                    <AnimalDetail />
                  </ApexTenantRouteGuard>
                )}
              />
              <Route path="login" element={<Login />} />
              <Route path="register-tenant" element={<TenantRegistrationGuard />} />
              <Route
                path="test"
                element={(
                  <ApexTenantRouteGuard>
                    <MatchTest />
                  </ApexTenantRouteGuard>
                )}
              />
              <Route
                path="test/results"
                element={(
                  <ApexTenantRouteGuard>
                    <MatchResults />
                  </ApexTenantRouteGuard>
                )}
              />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="animals" element={<AnimalsManager />} />
              <Route path="animals/new" element={<AnimalCreate />} />
              <Route path="animals/:id" element={<AnimalEdit />} />
            </Route>

            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                    <p className="text-gray-500">Pagina no trobada</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}
