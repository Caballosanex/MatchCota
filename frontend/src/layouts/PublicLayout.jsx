import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { resolveHostContext } from '../routing/hostRouting';

const apexNavLinkClass = 'inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-primary/10 hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2';
const tenantNavLinkClass = 'inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-primary/10 hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2';

function ApexPublicHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-h-16 items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 shadow-sm shadow-slate-200/70 sm:px-6">
                    <div className="flex items-center gap-4">
                        <div className="flex shrink-0 items-center">
                            <Link to="/" className="text-2xl font-bold text-primary">
                                MatchCota
                            </Link>
                        </div>
                        <div className="hidden sm:flex sm:items-center sm:gap-2">
                            <Link to="/register-tenant" className={apexNavLinkClass}>
                                Registra una protectora
                            </Link>
                            <Link to="/login" className={apexNavLinkClass}>
                                Accés Admin
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <Link to="/register-tenant" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2">
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
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-h-16 items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 shadow-sm shadow-slate-200/70 sm:px-6">
                    <div className="flex items-center gap-4">
                        <div className="flex shrink-0 items-center">
                            <Link to="/" className="text-2xl font-bold text-primary">
                                {displayName}
                            </Link>
                        </div>
                        <div className="hidden sm:flex sm:items-center sm:gap-2">
                            <Link to="/home" className={tenantNavLinkClass}>
                                Inici
                            </Link>
                            <Link to="/animals" className={tenantNavLinkClass}>
                                Animals
                            </Link>
                            <Link to="/test" className={tenantNavLinkClass}>
                                Test Compatibilitat
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-all duration-200 hover:border-primary/30 hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2">
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
        <footer className="border-t border-slate-200/70 bg-white/80 py-8 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-6 py-5 shadow-sm shadow-slate-200/70">
                    <p className="text-center text-sm font-medium text-slate-500">
                        &copy; {currentYear} {displayName}. Tots els drets reservats.
                    </p>
                </div>
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
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-white via-slate-50 to-indigo-50/40 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
            </div>
            {!isAuthenticationPage && (
                isTenantHost
                    ? (showTenantHeader ? <TenantPublicHeader tenantName={tenant?.name} /> : null)
                    : <ApexPublicHeader />
            )}
            <main className={`flex-grow ${isAuthenticationPage ? 'flex flex-col' : ''}`}>
                <div className={isAuthenticationPage ? 'h-full w-full p-0' : 'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
                    {showTenantNotFound ? <TenantNotFoundState error={error} /> : <Outlet />}
                </div>
            </main>
            {!isAuthenticationPage && (
                <PublicFooter tenantName={tenant?.name} />
            )}
        </div>
    );
}
