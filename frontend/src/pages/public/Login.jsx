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

                    {/* FORMULARI EN SÍ. Acoblat directament a React Hook Form mitjançant "handleSubmit(laTevaFuncio)" */}
                    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>

                        {/* Bloc Inputs (Camps) */}
                        <div className="space-y-6">

                            {/* CAIXA: CORREU ELECTRÒNIC */}
                            <div className="relative group">
                                <label className="text-[11px] font-black text-[#4A90A4] uppercase tracking-widest mb-2 block ml-1">Correu electrònic</label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    // JA NO CAL `value` o `onChange`. `...register("email")` fa tota la màgia invisible.
                                    {...register('email')}
                                    placeholder="hola@la-teva-entitat.com"
                                    className={`w-full bg-gray-50/50 border-2 py-4 px-6 rounded-2xl focus:bg-white focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300 shadow-sm
                                        ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-[#4A90A4]'}`}
                                />
                                {/* PINTANT L'ERROR ESPECÍFIC DE ZOD */}
                                {errors.email && (
                                    <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">
                                        *{errors.email.message}
                                    </span>
                                )}
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
                                    autoComplete="current-password"
                                    {...register('password')}
                                    placeholder="••••••••"
                                    className={`w-full bg-gray-50/50 border-2 py-4 px-6 rounded-2xl focus:bg-white focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300 shadow-sm
                                        ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-[#4A90A4]'}`}
                                />
                                {errors.password && (
                                    <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">
                                        *{errors.password.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* CAIXA D'ERRORS CONDICIONALS (BACKEND EXTERNS) */}
                        {apiError && (
                            <div className="text-red-500 text-xs font-bold flex gap-2 items-center animate-shake bg-red-50 p-3 rounded-lg border border-red-100">
                                {/* Icona Petita Error */}
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                {apiError}
                            </div>
                        )}

                        {/* BOTÓ D'ENVIAR SUBMIT (blau cridaner per facilitar-ho al client) */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting} // Si React Hook Form ho està eviant i la promesa no respon, es bloca botó auto
                                className="w-full bg-[#4A90A4] text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-[#4A90A4]/20 hover:bg-[#3a7c8d] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Verificant...' : 'Entrar ara'}
                                {/* Fletxeta animada al passar el ratolí */}
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

            {/* BARRA DECORATIVA A BAIX DE TOT PINTADA A COLOR BLAU I LILA SUAU */}
            <div className="h-2 bg-gradient-to-r from-[#4A90A4] to-indigo-100"></div>
        </div>
    );
}
