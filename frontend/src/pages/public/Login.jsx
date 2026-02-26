// Hook principal d'estat per a formularis
import { useState } from 'react';
// Hooks d'enrutament:
// useNavigate ens permet canviar de pàgina per codi (ex: després del login)
// useLocation ens diu d'on ve l'usuari (ex: si intentava entrar a /admin sense estar loguejat)
import { useNavigate, useLocation, Link } from 'react-router-dom';
// El nostre Custom Hook que controla TOTA la sessió i el localStorage
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

/**
 * COMPONENT PÀGINA: Login (Inici de sessió)
 * ----------------------------------------------------------------------
 * Pàgina on les protectores posen el seu email i password per entrar al Dashboard.
 * Un cop loguejats, se'ls redirigeix al Dashboard Privé.
 */
export default function Login() {
    // 1. ESTATS DEL FORMULARI
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Guardem un missatge d'error si el backend diu "Credencials invàlides"
    const [error, setError] = useState('');

    // 2. IMPORTEM EINES I CONTEXT
    // Traiem només la funció `login` del nostre AuthContext
    const { login } = useAuth();
    // history intern
    const navigate = useNavigate();
    // estat de la url actual
    const location = useLocation();

    // TACTICA INTEL·LIGENT (Redirect from):
    // Si l'usuari anava a "/admin/animals" però l'hem expulsat cap al "/login",
    // ho guardem a `location.state.from`. Si no hi venia de cap lloc estrany, 
    // l'enviarem directament al "/admin/dashboard" per defecte.
    const from = location.state?.from?.pathname || '/admin/dashboard';

    /**
     * GESTOR D'ENVIAMENT DEL FORMULARI
     * S'executa només quan es fa click a "Entrar ara"
     */
    const handleSubmit = async (e) => {
        // Bloqueja que la pàgina web del navegador intenti recarregar-se a 'lo loco'.
        e.preventDefault();
        // Netegem errors antics
        setError('');

        try {
            // Cridem la funció principal `login` que vam crear a AuthContext.jsx
            // Ella farà el POST al backend i guardarà el Token al LocalStorage.
            await login(email, password);

            // Si arriba a aquesta línia, vol dir que el Login ha passat amb èxit!
            // Ara enviem l'usuari cap a dins (veure explicació a dalt `from`)
            // replace: true fa que l'usuari no pugui donar-li al botó enrere i tornar a veure el Login.
            navigate(from, { replace: true });
        } catch (err) {
            // Si l'API diu 401 Unauthorized, caurà aquí. Pintem en vermell.
            setError('Credencials incorrectes');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">

            {/* CAPÇALERA MINIMALISTA (Només Logo per no distreure) */}
            <div className="p-8">
                <Link to="/" className="inline-flex items-center gap-3">
                    {/* Logo blau personalitzat MatchCota */}
                    <div className="w-10 h-10 bg-[#4A90A4] rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold text-[#4A90A4]">MatchCota</span>
                </Link>
            </div>

            {/* CONTINGUT CENTRAL (L'espai gran on posar el formulari) 
                flex-grow ocupa tota la resta de l'alçada disponible fins a sota. */}
            <div className="flex-grow flex items-center justify-center p-8">

                {/* Contenidor restringit d'amplada perquè no sembli immens en PC */}
                <div className="w-full max-w-sm">
                    {/* TÍTOLS INTRODUCTORIS */}
                    <div className="mb-12">
                        <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Benvingut/da</h2>
                        <p className="text-gray-400 font-bold tracking-tight">
                            Accedeix al teu panell de control per continuar gestionant les teves adopcions.
                        </p>
                    </div>

                    {/* FORMULARI EN SÍ. Al fer "enter" dispara onSubmbit={handleSubmit} */}
                    <form className="space-y-8" onSubmit={handleSubmit}>

                        {/* Bloc Inputs (Camps) */}
                        <div className="space-y-6">

                            {/* CAIXA: CORREU ELECTRÒNIC */}
                            <div className="relative group">
                                <label className="text-[11px] font-black text-[#4A90A4] uppercase tracking-widest mb-2 block ml-1">Correu electrònic</label>
                                <input
                                    type="email"
                                    required // Atribut HTML base per requerir valors
                                    value={email} // Vinculo el component al Hook d'estat
                                    onChange={(e) => setEmail(e.target.value)} // Empleno el component amb la nova info
                                    placeholder="hola@la-teva-entitat.com"
                                    className="w-full bg-gray-50/50 border-2 border-gray-100 py-4 px-6 rounded-2xl focus:border-[#4A90A4] focus:bg-white focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300 shadow-sm"
                                />
                            </div>

                            {/* CAIXA: CONTRASENYA */}
                            <div className="relative group">
                                {/* Label i l'opció oblit junts */}
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-black text-[#4A90A4] uppercase tracking-widest block ml-1">Contrasenya</label>
                                    {/* Link simple que actualment no porta a cap lloc realment # */}
                                    <a href="#" className="text-[11px] font-black text-gray-300 uppercase tracking-widest hover:text-[#4A90A4] transition-colors">Has oblidat la clau?</a>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50/50 border-2 border-gray-100 py-4 px-6 rounded-2xl focus:border-[#4A90A4] focus:bg-white focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* CAIXA D'ERRORS CONDICIONALS */}
                        {/* && significa "si l'esquerra es compleix (hi ha algun error) MÀGICAMENT ensenya el que ve a la dreta (aquest div HTML vermell)." */}
                        {error && (
                            <div className="text-red-500 text-xs font-bold flex gap-2 items-center animate-shake">
                                {/* Icona Petita Error */}
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                {error}
                            </div>
                        )}

                        {/* BOTÓ D'ENVIAR SUBMIT (blau cridaner per facilitar-ho al client) */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full bg-[#4A90A4] text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-[#4A90A4]/20 hover:bg-[#3a7c8d] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group"
                            >
                                Entrar ara
                                {/* Fletxeta animada al passar el ratolí */}
                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* REDIRECCIÓ AL REGISTRE PEL QUE S'EQUIVOCA (Botó per a visitants no registrats) */}
                    <div className="mt-16 text-center">
                        <p className="text-gray-400 font-bold">
                            Encara no tens un espai?{' '}
                            <Link to="/register-tenant" className="text-[#4A90A4] hover:text-[#3a7c8d] underline decoration-2 underline-offset-8 transition-all">
                                Crea la teva protectora
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* BARRA DECORATIVA A BAIX DE TOT PINTADA A COLOR BLAU I LILA SUAU */}
            <div className="h-2 bg-gradient-to-r from-[#4A90A4] to-indigo-100"></div>
        </div>
    );
}
