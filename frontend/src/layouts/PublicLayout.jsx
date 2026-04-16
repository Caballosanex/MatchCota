import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { resolveHostContext } from '../routing/hostRouting';

function ApexPublicHeader() {
    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-2xl font-bold text-primary">
                                MatchCota
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link to="/register-tenant" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Registra una protectora
                            </Link>
                            <Link to="/login" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Accés Admin
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <Link to="/register-tenant" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            Crea el teu shelter
                        </Link>
                    </div>

                </div>
            </div>
        </header>
    );
}

function TenantPublicHeader({ tenantName }) {
    const displayName = tenantName || 'Shelter MatchCota';

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-2xl font-bold text-primary">
                                {displayName}
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link to="/home" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Inici
                            </Link>
                            <Link to="/animals" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Animals
                            </Link>
                            <Link to="/test" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Test Compatibilitat
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <Link to="/login" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-xs font-medium uppercase tracking-wide">
                            Accés administració
                        </Link>
                    </div>

                </div>
            </div>
        </header>
    );
}

function PublicFooter({ tenantName }) {
    const currentYear = new Date().getFullYear();
    const displayName = tenantName ? tenantName : 'MatchCota';

    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-gray-500">
                    &copy; {currentYear} {displayName}. Tots els drets reservats.
                </p>
            </div>
        </footer>
    );
}

function TenantNotFoundState({ error }) {
    const fallbackMessage =
        typeof error === 'string' ? error : 'Verify the subdomain spelling, or return to https://matchcota.tech to register or locate your shelter URL.';
    const title = typeof error === 'object' && error?.title ? error.title : 'We could not find that shelter';
    const message = typeof error === 'object' && error?.message ? error.message : fallbackMessage;
    const recoveryUrl = typeof error === 'object' && error?.recoveryUrl ? error.recoveryUrl : 'https://matchcota.tech';

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-4 text-base text-slate-600">{message}</p>
                <div className="mt-8">
                    <a
                        href={recoveryUrl}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                    >
                        Return to matchcota.tech
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function PublicLayout() {
    const { tenant, error, loading, prebootStatus } = useTenant();
    const currentLocation = useLocation();
    const hostContext = resolveHostContext();
    const isAuthenticationPage = ['/login', '/register-tenant'].includes(currentLocation.pathname);
    const showTenantNotFound = error && typeof error === 'object' && error.type === 'tenant-not-found';
    const isTenantHost = hostContext.isTenantHost;
    const showTenantHeader = isTenantHost && (Boolean(tenant?.name) || prebootStatus !== 'tenant-unresolved' || !loading);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {!isAuthenticationPage && (
                isTenantHost
                    ? (showTenantHeader ? <TenantPublicHeader tenantName={tenant?.name} /> : null)
                    : <ApexPublicHeader />
            )}
            <main className={`flex-grow ${isAuthenticationPage ? 'flex flex-col' : ''}`}>
                <div className={isAuthenticationPage ? 'w-full h-full p-0' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
                    {showTenantNotFound ? <TenantNotFoundState error={error} /> : <Outlet />}
                </div>
            </main>
            {!isAuthenticationPage && (
                <PublicFooter tenantName={tenant?.name} />
            )}
        </div>
    );
}
