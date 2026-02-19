/**
 * [DEV] Landing page de la plataforma MatchCota.
 *
 * Aquesta pàgina es mostra quan s'accedeix a localhost:5173 sense cap tenant
 * (sense ?tenant=slug ni subdomini). Serveix per:
 *   - Presentar el projecte MatchCota
 *   - Llistar les protectores actives (tenants) amb accés directe
 *   - Oferir el formulari d'onboarding per a noves protectores
 *
 * [PROD] A AWS, la landing de MatchCota serà una app/domini separat
 * (matchcota.com) i cada protectora tindrà el seu propi subdomini
 * (slug.matchcota.com) creat automàticament per una Lambda durant l'onboarding.
 * Aquesta pàgina NO existirà en producció tal com és ara.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTenants } from '../../api/tenants';

export default function Landing() {
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(true);
    const [apiStatus, setApiStatus] = useState('checking...');

    useEffect(() => {
        // Health check
        fetch('/api/v1/health')
            .then(res => res.json())
            .then(data => setApiStatus(data.status))
            .catch(() => setApiStatus('error'));

        // Carregar llista de protectores
        getTenants()
            .then(data => {
                setTenants(data);
                setLoadingTenants(false);
            })
            .catch(() => setLoadingTenants(false));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
                    <span className="text-2xl font-bold text-indigo-600">MatchCota</span>
                    <div className="flex gap-4">
                        <a href="#protectores" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                            Protectores
                        </a>
                        <Link
                            to="/register-tenant"
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                            Registrar Protectora
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
                    Match<span className="text-indigo-600">Cota</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                    Plataforma intel·ligent que connecta protectores d'animals amb adoptants
                    mitjançant un sistema de compatibilitat.
                </p>
                <div className="flex justify-center gap-4">
                    <Link
                        to="/register-tenant"
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Registra la teva Protectora
                    </Link>
                    <a
                        href="#protectores"
                        className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                    >
                        Veure Protectores
                    </a>
                </div>
            </section>

            {/* Com funciona */}
            <section className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Com funciona?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-indigo-600">1</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">La protectora registra els seus animals</h3>
                            <p className="text-gray-600">
                                Cada protectora gestiona els seus animals amb fitxes completes:
                                caràcter, energia, sociabilitat i més.
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-indigo-600">2</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">L'adoptant fa el test de compatibilitat</h3>
                            <p className="text-gray-600">
                                Un qüestionari sobre el seu estil de vida, experiència i
                                preferències genera un perfil d'adoptant.
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-indigo-600">3</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">L'algoritme troba els millors matchs</h3>
                            <p className="text-gray-600">
                                Creuem els vectors d'adoptant i animal per mostrar un ranking
                                de compatibilitat amb explicacions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Protectores Actives */}
            <section id="protectores" className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
                        Protectores a la plataforma
                    </h2>
                    <p className="text-center text-gray-500 mb-8">
                        {/* [DEV] En producció, cada protectora tindria el seu subdomini (slug.matchcota.com) */}
                        Accedeix a qualsevol protectora per veure els seus animals i fer el test de compatibilitat.
                    </p>

                    {loadingTenants ? (
                        <div className="text-center text-gray-500 py-8">Carregant protectores...</div>
                    ) : tenants.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            No hi ha protectores registrades encara.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenants.map((t) => (
                                <a
                                    key={t.id}
                                    href={`/?tenant=${t.slug}`}
                                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl font-bold text-indigo-600">
                                                {t.name.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                {t.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {t.city || 'Ubicació no especificada'}
                                            </p>
                                            {t.email && (
                                                <p className="text-sm text-gray-400 mt-1 truncate">{t.email}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-mono">{t.slug}</span>
                                        <span className="text-sm text-indigo-600 font-medium">
                                            Entrar →
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Sobre el Projecte */}
            <section className="bg-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Sobre el Projecte</h2>
                    <p className="text-gray-600 mb-6">
                        MatchCota és un projecte desenvolupat per l'equip ASIX - DAW1 - DAW2
                        amb l'objectiu de reduir les adopcions fallides. Moltes devolucions
                        d'animals no són per manca d'amor, sinó per manca de compatibilitat
                        entre l'adoptant i l'animal.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900">ASIX</h4>
                            <p className="text-sm text-gray-600 mt-1">Infraestructura, Docker, AWS, CI/CD</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900">DAW1</h4>
                            <p className="text-sm text-gray-600 mt-1">Backend FastAPI, API, Auth, Matching</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900">DAW2</h4>
                            <p className="text-sm text-gray-600 mt-1">Frontend React, UI/UX, Components</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* API Status (dev) */}
            <section className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-xs text-gray-400">
                        API Status: <span className="font-mono">{apiStatus}</span>
                        {' · '}Protectores registrades: {tenants.length}
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        &copy; {new Date().getFullYear()} MatchCota. Plataforma SaaS multi-tenant per a protectores d'animals.
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Projecte ASIX - DAW1 - DAW2
                    </p>
                </div>
            </footer>
        </div>
    );
}
