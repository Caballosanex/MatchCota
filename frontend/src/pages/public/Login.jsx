// Hook principal d'estat per a formularis (Només ho farem servir ara per errors globals d'API)
import { useState } from 'react';
// Navegació
import { useNavigate, useLocation, Link } from 'react-router-dom';
// Hook propi
import { useAuth } from '../../hooks/useAuth';

// ----------------------------------------------------------------------
// IMPORTACIONS DE FORMULARIS AVANÇATS (REACT-HOOK-FORM + ZOD)
// ----------------------------------------------------------------------
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

/**
 * COMPONENT PÀGINA: Login (Inici de sessió)
 * ----------------------------------------------------------------------
 * PER QUÈ UTILITZEM ZOD I REACT-HOOK-FORM AQUÍ?
 * 
 * Abans utilitzàvem "useState" per cada camp de text (email i password) i validàvem a mà. 
 * Ara utilitzem `react-hook-form` que gestiona tots els inputs de cop de manera 
 * invisible "per sota", alliberant a React de fer càlculs i re-dibuixos a cada lletra teclejada (Més ràpid!).
 * 
 * L'eina `zod` funciona com una frontera policial (Schema). Definim com ha de ser un input
 * d'entrada perfecte abans ni tan sols de tocar l'API. Si alguna cosa no quadra (ex. format email invàlid),
 * salta automàticament els missatges d'error al camp 'errors' del propi form.
 */

// 1. DEFINIM "L'ESQUEMA" (Lleis policials que ha de complir el formulari de Login)
const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Aquest camp és obligatori.") // Si escriuen res
        .email("L'adreça de correu no té un format vàlid."), // Validació auto d'arroba, dominis, etc
    password: z
        .string()
        .min(1, "Siusplau, introdueix la clau."),
});


export default function Login() {
    // PREPAREM EL NOSTRE SUPER-FORMULARI (Vinculem Zod a React Hook Form)
    const {
        register, // Funció per "inscriure" o "connectar" un input HTML al sistema màgic
        handleSubmit, // Funció substituta que es dispara en polsar Enter i COMPROVA que tot estigui bé
        formState: { errors, isSubmitting }, // "errors" contindrà què ha fallat (ex: errors.email.message) i "isSubmitting" és un boolean automàtic segons si estem processant-lo.
    } = useForm({
        resolver: zodResolver(loginSchema), // Connectem el polícia (Zod)
    });

    // Guardem un missatge d'error general pel backend (ex. La clau no quadra de la BD)
    const [apiError, setApiError] = useState('');

    // Traiem només la funció `login` del nostre AuthContext
    const { login } = useAuth();
    // history intern
    const navigate = useNavigate();
    // estat de la url actual
    const location = useLocation();

    // Redirecció intel·ligent
    const from = location.state?.from?.pathname || '/admin/dashboard';

    /**
     * GESTOR D'ENVIAMENT DEL FORMULARI
     * 
     * IMPORTANT: Si arriba aquí, Zod JA HA DONAT EL VISTIPLAU.
     * Les dades ('data') són 100% fiables i correctes. Ja no calen Ifs ni Validacions aquí!
     */
    const onSubmit = async (data) => {
        setApiError(''); // Netegem la pantalla de peticions fetes en el passat

        try {
            // "data.email" i "data.password" ja estan validats pel zod.
            await login(data.email, data.password);

            // Si funciona ens anem al dashboard
            navigate(from, { replace: true });
        } catch (err) {
            setApiError(err?.message || 'Credencials incorrectes o entitat no trobada');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100/40 flex flex-col font-sans">
            <div className="mx-auto w-full max-w-6xl px-6 pt-8">
                <Link to="/" className="inline-flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold text-indigo-700">MatchCota</span>
                </Link>
            </div>

            <div className="flex-grow flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                    <section className="hidden lg:block rounded-3xl bg-white/80 border border-indigo-100 shadow-xl p-8">
                        <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                            Accés per protectores
                        </span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-900">Benvingut/da</h1>
                        <p className="mt-3 text-gray-600 leading-relaxed">
                            Accedeix al teu panell de control per continuar gestionant adopcions, animals i sol·licituds.
                        </p>
                        <ul className="mt-6 space-y-3 text-sm text-gray-600">
                            <li className="flex items-center gap-2"><span className="text-indigo-600">•</span> Gestió centralitzada del refugi</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-600">•</span> Flux d'adopció amb matching</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-600">•</span> Seguiment de leads en temps real</li>
                        </ul>
                    </section>

                    <div className="w-full rounded-3xl border border-gray-100 bg-white shadow-xl p-6 sm:p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Inicia sessió</h2>
                            <p className="mt-2 text-gray-500 font-medium">Introdueix les teves credencials per continuar.</p>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-5">
                                <div className="relative group">
                                    <label className="text-[11px] font-black text-indigo-700 uppercase tracking-widest mb-2 block ml-1">Correu electrònic</label>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        {...register('email')}
                                        placeholder="hola@la-teva-entitat.com"
                                        className={`w-full bg-gray-50 border-2 py-3.5 px-5 rounded-xl focus:bg-white focus:outline-none transition-all duration-300 font-semibold text-gray-900 placeholder-gray-300 shadow-sm
                                            ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-400'}`}
                                    />
                                    {errors.email && (
                                        <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">
                                            *{errors.email.message}
                                        </span>
                                    )}
                                </div>

                                <div className="relative group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[11px] font-black text-indigo-700 uppercase tracking-widest block ml-1">Contrasenya</label>
                                        <a href="#" className="text-[11px] font-black text-gray-300 uppercase tracking-widest hover:text-indigo-500 transition-colors">Has oblidat la clau?</a>
                                    </div>
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        {...register('password')}
                                        placeholder="••••••••"
                                        className={`w-full bg-gray-50 border-2 py-3.5 px-5 rounded-xl focus:bg-white focus:outline-none transition-all duration-300 font-semibold text-gray-900 placeholder-gray-300 shadow-sm
                                            ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-400'}`}
                                    />
                                    {errors.password && (
                                        <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">
                                            *{errors.password.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {apiError && (
                                <div className="text-red-500 text-xs font-bold flex gap-2 items-center animate-shake bg-red-50 p-3 rounded-lg border border-red-100">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    {apiError}
                                </div>
                            )}

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Verificant...' : 'Entrar ara'}
                                    {!isSubmitting && (
                                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div className="h-2 bg-gradient-to-r from-indigo-500 to-indigo-300"></div>
        </div>
    );
}
