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
        // Contenidor fons gris, que ocupa 100% de la pantalla (h-screen)
        <div className="flex h-screen bg-gray-100">

            {/* LADO IZQUIERDO: MENÚ LATERAL (Sidebar) */}
            {/* 'hidden md:flex' vol dir que aquest menú lateral desapareixerà als mòbils.
                Hauríeu de fer un menú hamburguesa per mòbil més endavant, però per començar està bé! */}
            <div className="hidden md:flex md:flex-shrink-0">
                {/* Caixó vertical de color gris fosc/negre (bg-gray-800) */}
                <div className="flex flex-col w-64 bg-gray-800">

                    {/* Capçalera del menú (Logo/Títol) */}
                    <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
                        <span className="text-xl font-bold text-white">Tauler Admin</span>
                    </div>

                    {/* Llista d'enllaços per navegar dins del panell */}
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <nav className="flex-1 px-2 py-4 space-y-1">
                            {/* Aquests enllaços canvien dinàmicament el contingut d'Outlet */}
                            <Link to="/admin/dashboard" className="bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Inici (Resum)
                            </Link>
                            <Link to="/admin/animals" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Gestió d'Animals
                            </Link>
                            <Link to="/admin/leads" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Sol·licituds / Leads
                            </Link>
                            <Link to="/admin/settings" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Configuració del Compte
                            </Link>
                        </nav>
                    </div>

                    {/* Bloc Inferior del menú: El Perfil i botó de sortir */}
                    <div className="flex-shrink-0 flex bg-gray-700 p-4">
                        <div className="flex items-center w-full">
                            <div className="ml-3 w-full overflow-hidden">
                                {/* Mostrem el nom o l'email de qui està connectat ara mateix */}
                                <p className="text-sm font-medium text-white truncate">{user.name || user.email}</p>

                                {/* El botó encarregat de disparar la funció 'logout' del nostre AuthContext */}
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="block w-full text-left mt-1 py-1 leading-none text-xs font-medium text-gray-300 hover:text-white cursor-pointer focus:outline-none"
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
