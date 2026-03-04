// Importem les eines de React Router DOM.
// Aquestes eines ens permeten crear una aplicació d'una sola pàgina (SPA) on
// canviem de pantalla sense haver de recarregar el navegador.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importem els nostres "Proveïdors" de dades globals (Contexts).
// Envoltant la nostra App amb ells, fem que qualsevol pantalla pugui saber
// quina és la protectora actual i qui és l'usuari connectat.
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';

// Importem els "Esquelets" (Layouts) de les nostres pàgines.
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// ==========================================
// IMPORTACIÓ DE PÀGINES (Pantalles)
// ==========================================

// Pàgines de la Plataforma (MatchCota central)
import Landing from './pages/platform/Landing'; // La pàgina de presentació
import DemoTest from './pages/platform/DemoTest';

// Pàgines Públiques (el que veu l'adoptant quan visita una protectora)
import Home from './pages/public/Home';
import Animals from './pages/public/Animals';
import AnimalDetail from './pages/public/AnimalDetail';
import Login from './pages/public/Login';

// Pàgines Privades (el que veu l'administrador de la protectora)
import Dashboard from './pages/admin/Dashboard';
import AnimalsManager from './pages/admin/AnimalsManager';
import AnimalCreate from './pages/admin/AnimalCreate';
import AnimalEdit from './pages/admin/AnimalEdit';

/**
 * COMPONENTE ARREL: App
 * ----------------------------------------------------------------------
 * Aquest és el cor de la nostra aplicació. Aquí definim el "mapa" de carreteres (Rutes).
 * Li diem a React: "Si l'usuari va a la URL /animals, ensenya-li el component Animals".
 */
export default function App() {
  return (
    // 1. PROVEÏDORS DE DADES
    // L'ordre importa: AuthProvider necessita saber el Tenant, així que TenantProvider va fora.
    <TenantProvider>
      <AuthProvider>

        {/* 2. EL NAVEGADOR (Router) */}
        {/* Envolta tota la part visual i habilita la navegació per URLs */}
        <BrowserRouter>
          <Routes>

            {/* -------------- RUTES INDEPENDENTS -------------- */}
            {/* Aquestes rutes no tenen cap Layout comú, ocupen el 100% de la pantalla pel seu compte */}
            <Route path="/demo" element={<DemoTest />} />
            <Route path="/" element={<Landing />} />

            {/* -------------- RUTES PÚBLIQUES -------------- */}
            {/* Aquí utilitzem el concepte de "Rutes Niuades" (Nested Routes).
                Tot el que hi ha a dins d'aquest bloc es mostrarà DINS del <Outlet /> de PublicLayout. */}
            <Route element={<PublicLayout />}>
              <Route path="home" element={<Home />} />
              <Route path="animals" element={<Animals />} />
              <Route path="animals/:id" element={<AnimalDetail />} />

              {/* Rutes d'accés i registre */}
              <Route path="login" element={<Login />} />
              <Route path="test" element={<div className="p-8 text-center text-gray-500">Test de Compatibilitat (Sprint 5)</div>} />
            </Route>

            {/* -------------- RUTES D'ADMINISTRACIÓ -------------- */}
            {/* Igual que abans, però amb l'AdminLayout (que té el menú lateral negre i protegeix amb codi que no entris si no estàs loguejat) */}
            <Route path="/admin" element={<AdminLayout />}>
              {/* "index" vol dir que si visites exactament "/admin", automàticament saltes a "/admin/dashboard" */}
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />
              <Route path="animals" element={<AnimalsManager />} />
              <Route path="animals/new" element={<AnimalCreate />} />
              <Route path="animals/:id" element={<AnimalEdit />} />
              <Route path="leads" element={<div className="p-8">Leads (Sprint 7)</div>} />
              <Route path="settings" element={<div className="p-8">Configuracio (Pendent)</div>} />
            </Route>

            {/* -------------- RUTA ERROR 404 -------------- */}
            {/* El "*" (asterisc) captura QUALSEVOL adreça que no hagi coincidit amb les de dalt. */}
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
