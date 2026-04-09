import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

export default function AdminLayout() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { state: { from: location } });
        }
    }, [user, loading, navigate, location]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregant l'àrea privada...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 bg-slate-900 shadow-xl z-10 border-r border-slate-800">
                    <div className="flex items-center h-20 flex-shrink-0 px-6 bg-slate-900/80 backdrop-blur border-b border-slate-800 gap-3">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <span className="text-xl font-extrabold text-white tracking-tight">MatchCota</span>
                    </div>

                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <nav className="flex-1 px-3 py-6 space-y-2">
                            <Link to="/admin/dashboard" className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${location.pathname.includes('/admin/dashboard')
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                                }`}>
                                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                Taulell de Control
                            </Link>
                            <Link to="/admin/animals" className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${location.pathname.includes('/admin/animals')
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                                }`}>
                                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Gestió d'Animals
                            </Link>
                        </nav>
                    </div>

                    <div className="flex-shrink-0 flex bg-slate-900/50 p-4 border-t border-slate-800">
                        <div className="flex items-center w-full">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 font-bold">
                                {((user?.name || user?.email || 'A').charAt(0)).toUpperCase()}
                            </div>
                            <div className="ml-3 w-full overflow-hidden">
                                <p className="text-sm font-bold text-white truncate">{user?.name || 'Admin'}</p>
                                <p className="text-xs text-slate-400 truncate mb-1">{user?.email || 'Sense correu'}</p>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="block w-full text-left py-1 leading-none text-xs font-semibold text-red-400 hover:text-red-300 cursor-pointer focus:outline-none transition-colors"
                                >
                                    Tancar Sessió
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                <main className="flex-1 relative overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>

        </div>
    );
}
