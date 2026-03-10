// Importem les eines de navegació de React Router.
// - Outlet: Marca on anirà el contingut canviant de la pàgina.
// - Link: Per navegar asincrònicament sense recarregar.
// - useNavigate: Una funció que ens permet redirigir l'usuari "per la força" (ex: foragitar-lo si no està identificat).
// - useLocation: Ens diu on estàvem intentant anar abans que ens fessin fora (per tornar-hi després de loguejar-nos).
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

// Importem el nostre Hook de seguretat (l'hem creat al AuthContext).
import { useAuth } from '../hooks/useAuth';

// Eines bàsiques de React
import { useEffect, useState } from 'react';

/**
 * COMPONENTE PRINCIPAL: AdminLayout (El Panell de Control)
 * ----------------------------------------------------------------------
 * Propòsit: Aquest és l'esqueleto privat. Només la gent de la protectora hi pot entrar.
 * Té dos treballs principals:
 * 1. SEGURETAT: Si algú intenta entrar aquí sense haver fet Login, el fem fora cap a la pàgina de login.
 * 2. ESTRUCTURA VISUAL: Mostra un menú lateral (sidebar) negre a l'esquerra i el contingut a la dreta.
 */
export default function AdminLayout() {
    // 1. OBTENIR DADES DE SEGURETAT
    // Agafem l'usuari actual, si el sistema encara està "carregant" la memòria, i el botó/funció de tancar sessió.
    const { user, loading, logout } = useAuth();

    // Creem els "conductors" de la nostra navegació
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * EFECTE DE SEGURETAT (Guardià de la Ruta / Protected Route)
     * Cada vegada que l'usuari o la ruta canviïn, el React revisarà aquesta funció.
     */
    useEffect(() => {
        // Condició: Si ja HEM ACABAT de mirar el LocalStorage (!loading) 
        // I resulta que NO tenim ningun usuari vàlid (!user)...
        if (!loading && !user) {
            // El fem fora, l'enviem forçosament a '/login'.
            // A més a més li passem l'estat "{ from: location }" d'amagatotis.
            // Això serveix perquè si intentava anar a "/admin/animals", quan acabi de posar
            // la contrasenya el poguem redirigir on volia anar originalment, i no a la pantalla principal.
            navigate('/login', { state: { from: location } });
        }
    }, [user, loading, navigate, location]);

    // Mentre React està llegint la memòria al principi (loading és true),
    // no ensenyeu de cop tota la pàgina, ensenyeu un text de "Carregant" (o podria ser un spinner).
    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregant l'àrea privada...</div>;
    }

    // Si hem acabat de carregar i resulta que NO estem loguejats, renderitzem res (null).
    // D'aquesta manera evitem la pantalla en blanc o flaixos mentre el \`useNavigate\` de dalt 
    // l'està enviant cap a la pàgina de "/login".
    if (!user) {
        return null;
    }

    // ARRIBAR AQUÍ SIGNIFICA QUE L'USUARI EXISTEIX I ESTÀ AUTENTICAT (LOGIN CORRECTE).
    // Procedim a pintar el tauler d'administrador.
    return (
        // Contenidor fons general, que ocupa 100% de la pantalla (h-screen)
        <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* LADO IZQUIERDO: MENÚ LATERAL (Sidebar) */}
            {/* 'hidden md:flex' vol dir que aquest menú lateral desapareixerà als mòbils.
                Hauríeu de fer un menú hamburguesa per mòbil més endavant, però per començar està bé! */}
            <div className="hidden md:flex md:flex-shrink-0">
                {/* Caixó vertical fosc elegant (bg-slate-900) */}
                <div className="flex flex-col w-64 bg-slate-900 shadow-xl z-10 border-r border-slate-800">

                    {/* Capçalera del menú (Logo/Títol) */}
                    <div className="flex items-center h-20 flex-shrink-0 px-6 bg-slate-900/80 backdrop-blur border-b border-slate-800 gap-3">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <span className="text-xl font-extrabold text-white tracking-tight">MatchCota</span>
                    </div>

                    {/* Llista d'enllaços per navegar dins del panell */}
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <nav className="flex-1 px-3 py-6 space-y-2">
                            {/* Aquests enllaços canvien dinàmicament el contingut d'Outlet */}
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
                            <Link to="/admin/leads" className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${location.pathname.includes('/admin/leads')
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                                }`}>
                                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                                Sol·licituds / Leads
                            </Link>
                            <Link to="/admin/settings" className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${location.pathname.includes('/admin/settings')
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                                }`}>
                                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Configuració
                            </Link>
                        </nav>
                    </div>

                    {/* Bloc Inferior del menú: El Perfil i botó de sortir */}
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

            {/* LADO DERECHO: CONTINGUT PRINCIPAL (Outlet) */}
            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                {/* L'etiqueta main ocupa la resta de l'espai i permet fer 'scroll' vertical si fa falta */}
                <main className="flex-1 relative overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">

                            {/* EXTREMADAMENT IMPORTANT:
                                Com que la Cabecera/Menú (sidebar) és fixa, només <Outlet /> canviarà.
                                Aquí és on React Router injectarà "/admin/animals" o "/admin/dashboard" 
                                sense tornar a carregar la pàgina sencera. */}
                            <Outlet />

                        </div>
                    </div>
                </main>
            </div>

        </div>
    );
}
