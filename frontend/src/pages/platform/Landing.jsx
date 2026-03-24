/**
 * [DEV] Landing page de la plataforma MatchCota.
 * ----------------------------------------------------------------------
 * Aquesta pàgina es mostra quan algú accedeix a la web principal (sense protectora).
 * Funciona com un aparador per convèncer a les protectores que utilitzin el nostre software.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Importem la funció per cridar al backend i saber quines protectores hi han
import { getTenants } from '../../api/tenants';
import heroImage from '../../assets/hero-image.jpg';

// ==========================================
// ICONS (Components visuals purs)
// Han estat fets amb SVG pel dissenyador.
// ==========================================

const ClipboardIcon = () => (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const PawIcon = () => (
    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.056c-3.14-1.298-5.32-3.116-6.613-5.334-1.47-2.52-1.396-5.465.176-7.382 1.34-1.63 3.615-1.604 5.253-1.02a4.4 4.4 0 011.184.6 4.39 4.39 0 011.185-.6c1.637-.584 3.913-.61 5.252 1.02 1.572 1.917 1.646 4.86.177 7.38-1.294 2.219-3.473 4.037-6.614 5.336zM3.46 8.52c-1.642 0-2.96-1.53-2.96-3.414 0-1.884 1.318-3.415 2.96-3.415 1.643 0 2.961 1.53 2.961 3.415 0 1.884-1.318 3.414-2.96 3.414zm4.61-4.733c-1.336 0-2.42-1.392-2.42-3.107S6.734.023 8.07.023c1.337 0 2.42 1.392 2.42 3.107s-1.083 3.107-2.42 3.107zm7.86 0c-1.337 0-2.42-1.392-2.42-3.107S14.594.023 15.93.023c1.336 0 2.42 1.392 2.42 3.107s-1.084 3.107-2.42 3.107zm4.61 4.733c-1.642 0-2.96-1.53-2.96-3.414 0-1.884 1.318-3.415 2.96-3.415 1.643 0 2.961 1.53 2.961 3.415 0 1.884-1.318 3.414-2.96 3.414z" />
    </svg>
);

const HeartIcon = () => (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

// Feature Icons (Colored backgrounds in design)
const TrendDownIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PiggyBankIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DiamondIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// ==========================================
// COMPONENT PRINCIPAL
// ==========================================
export default function Landing() {
    // Estat local de la Landing
    // 1. Array per guardar la llista de protectores que baixarem del servidor
    const [tenants, setTenants] = useState([]);
    // 2. Control de càrrega per mostrar un text de "Carregant..." mentre arriben les dades
    const [loadingTenants, setLoadingTenants] = useState(true);
    // 3. Estatus de l'API (per veure si el servidor en general està viu)
    const [apiStatus, setApiStatus] = useState('checking...');

    /**
     * EFECTE D'INICIACIÓ
     * El useEffect s'executa automàticament just quan s'obre la landing.
     */
    useEffect(() => {
        // A. Comprovació de Salut (Health check) - Li demanem al backend si està actiu (sprint 6/7 info)
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        fetch(`${apiUrl}/health`)
            .then(res => res.json())
            .then(data => setApiStatus(data.status))
            .catch(() => setApiStatus('error')); // Si falla la petició de xarxa, guardem 'error'

        // B. Carregar la llista de protectores (Tenants)
        getTenants()
            .then(data => {
                setTenants(data); // Guardem les protectores rebudes a l'estat local
                setLoadingTenants(false); // Ja no estem "carregant"
            })
            .catch(() => setLoadingTenants(false)); // Si dóna error, almenys apaguem el "carregant"
    }, []); // Array buit vol dir que això NOMÉS passarà 1 cop a l'inci

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- SECCIÓ 0: NAVEGACIÓ (HEADER) --- */}
            {/* 'fixed' fa que es quedi ancorat dalt de tot. 'backdrop-blur-md' li dóna aquell toc vidre matisat (glassmorphism) modern */}
            <header className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Logo from Figma seems to be a magnifying glass/paw icon in a circle */}
                        <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800">MatchCota</span>
                    </div>
                    {/* Botó de Registre de nova protectora */}
                    <Link
                        to="/register-tenant"
                        className="px-6 py-2.5 border border-indigo-200 text-indigo-600 rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium text-sm shadow-sm"
                    >
                        Registra't
                    </Link>
                </div>
            </header>

            {/* Espaiat "fantasma" de 20px (h-20) perquè el contingut no es col·loqui darrere la capçalera (ja que és 'fixed') */}
            <div className="h-20"></div>

            {/* --- SECCIÓ 1: HERO (Presentació Principal) --- */}
            {/*  Fem un Grid que mostrarà 2 columnes ('lg:grid-cols-2') en dispositius grans, text a l'esquerra, imatge a la dreta */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-left space-y-8">
                    <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                        Troba la llar <br />
                        perfecta per a <br />
                        cada animal
                    </h1>
                    <p className="text-xl text-gray-500 max-w-lg leading-relaxed">
                        Plataforma intel·ligent que connecta protectores amb adoptants mitjançant matching per compatibilitat.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {/* Botó principal - Crida a l'acció (CTA) */}
                        <Link
                            to="/register-tenant"
                            className="px-8 py-4 bg-[#B4C0FF] text-indigo-900 rounded-full font-bold hover:bg-[#A3B0FF] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-center"
                        >
                            Registra la teva protectora &rarr;
                        </Link>
                        {/* Botó secundari - Porta a la plana falsa d'enquesta React que acabem d'explicar (DemoTest) */}
                        <Link
                            to="/demo"
                            className="px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-full font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center"
                        >
                            Veure demo
                        </Link>
                    </div>
                </div>
                {/* Hero Illustration */}
                <div className="relative h-[500px] rounded-[40px] overflow-hidden shadow-2xl">
                    <img
                        src={heroImage}
                        alt="MatchCota platform preview"
                        className="w-full h-full object-cover"
                    />
                </div>
            </section>

            {/* --- SECCIÓ 2: HOW IT WORKS (Passos) --- */}
            <section className="bg-white py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Com funciona?</h2>
                        <p className="text-lg text-gray-400">En només 3 passos tens la teva pròpia plataforma d'adopcions</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {/* Step 1 */}
                        <div className="bg-white border border-gray-100 rounded-[30px] p-10 hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col items-center text-center">
                            {/* Icon Blue Circle */}
                            <div className="w-16 h-16 bg-[#6C8DCA] rounded-full flex items-center justify-center mb-8 shadow-blue-200 shadow-lg">
                                <ClipboardIcon />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">1. Registra't en 2 minuts</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Omple un formulari ràpid i tindràs el teu espai llest immediatament.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white border border-gray-100 rounded-[30px] p-10 hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col items-center text-center">
                            {/* Icon Yellow Circle */}
                            <div className="w-16 h-16 bg-[#FFC555] rounded-full flex items-center justify-center mb-8 shadow-yellow-200 shadow-lg">
                                <PawIcon />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">2. Puja els teus animals</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Afegeix les fitxes dels animals amb fotos i característiques per al matching.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white border border-gray-100 rounded-[30px] p-10 hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col items-center text-center">
                            {/* Icon Red Circle */}
                            <div className="w-16 h-16 bg-[#FF6B6B] rounded-full flex items-center justify-center mb-8 shadow-red-200 shadow-lg">
                                <HeartIcon />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">3. Els adoptants fan match</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                El sistema connecta automàticament cada animal amb els adoptants més compatibles.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECCIÓ 3: CARACTERÍSTIQUES (FEATURES) --- */}
            <section className="bg-gray-50/50 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Per què MatchCota?</h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Card 1: Menys devolucions (Green) */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-start gap-6 border border-gray-100">
                            <div className="w-14 h-14 bg-[#C1E1C1] rounded-2xl flex items-center justify-center flex-shrink-0">
                                <TrendDownIcon />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Menys devolucions</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    El matching per compatibilitat assegura que cada adopció sigui realment encertada, reduint animals retornats.
                                </p>
                            </div>
                        </div>

                        {/* Card 2: Estalvia temps (Blue) */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-start gap-6 border border-gray-100">
                            <div className="w-14 h-14 bg-[#BFD3E6] rounded-2xl flex items-center justify-center flex-shrink-0">
                                <ClockIcon />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Estalvia temps</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Automatitza el procés de trobar adoptants i rep leads qualificats directament al teu panell.
                                </p>
                            </div>
                        </div>

                        {/* Card 3: 100% gratuït (Yellow) */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-start gap-6 border border-gray-100">
                            <div className="w-14 h-14 bg-[#F2C94C] rounded-2xl flex items-center justify-center flex-shrink-0">
                                <PiggyBankIcon />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">100% gratuït</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Per a protectores i associacions sense ànim de lucre. Sense costos ocults ni comissions.
                                </p>
                            </div>
                        </div>

                        {/* Card 4: Fàcil d'usar (Red) */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all flex items-start gap-6 border border-gray-100">
                            <div className="w-14 h-14 bg-[#F28B82] rounded-2xl flex items-center justify-center flex-shrink-0">
                                <DiamondIcon />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Fàcil d'usar</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Interfície intuïtiva que no requereix coneixements tècnics. Si saps enviar un email, ja pots fer-ho servir.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECCIÓ 4: PEU DE PÀGINA (FOOTER) --- */}
            <footer className="bg-white border-t border-gray-100 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">MatchCota</span>
                            </div>
                            <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                                Plataforma intel·ligent que connecta protectores amb adoptants mitjançant matching per compatibilitat.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 text-lg">Enllaços</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Com funciona</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Ajuda</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contacte</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 text-lg">Contacte</h4>
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li className="flex items-center gap-3">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    info@matchcota.com
                                </li>
                                <li className="flex items-center gap-3">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    +34 900 123 456
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-8 text-center text-xs text-gray-400 font-medium">
                        2025 MatchCota. Tots els drets reservats.
                    </div>
                </div>
            </footer>

            {/* --- SECCIÓ Z: ÀREA SE DEV (Amagada sota el disseny normal però útil per als autors) --- */}
            {/* Això serveix per llistar directament les protectores i que l'usuari pugui entrar-hi directament.
                Està vinculada a l'estat local 'tenants' carregat del useEffect. */}
            <div className="bg-slate-900 text-slate-400 py-12 border-t-4 border-indigo-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-mono text-white">DEVICE AREA / TENANT LIST</h2>
                        <span className="px-3 py-1 bg-indigo-900 text-indigo-300 rounded text-xs font-mono">
                            API: {apiStatus}
                        </span>
                    </div>

                    {/* Si trigem a rebre dades de l'API: */}
                    {loadingTenants ? (
                        <div className="font-mono text-sm">Carregant protectores...</div>
                        // Si l'array està buit:
                    ) : tenants.length === 0 ? (
                        <div className="font-mono text-sm text-yellow-500">
                            No hi ha protectores registrades. Ves a "Registra't" per crear-ne una.
                        </div>
                        // Si tenim almenys un element dins l'array, pintem cada element (cadascun serà t):
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenants.map((t) => (
                                <a
                                    key={t.id}
                                    href={`/home?tenant=${t.slug}`}
                                    className="block bg-slate-800 rounded border border-slate-700 p-4 hover:border-indigo-500 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white">{t.name}</h3>
                                        <span className="text-xs font-mono bg-black px-2 py-1 rounded text-gray-500">{t.slug}</span>
                                    </div>
                                    <p className="text-xs mb-3">{t.city || 'No location'}</p>
                                    <div className="text-xs text-indigo-400">Accedir al tenant &rarr;</div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
