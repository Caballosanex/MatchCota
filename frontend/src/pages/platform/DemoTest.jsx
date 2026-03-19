// Importem els hooks d'Estat (per guardar respostes) i Efectes (pel temporitzador de càrrega)
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// --- ICONS & ASSETS (Animacions) ---
// Aquest és un sub-component molt petit utilitzat just aquí mateix per mostrar l'animació final de victòria.
const NormalConfetti = () => {
    // Generate some random positions for the confetti (100 peces de confeti caient)
    const pieces = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        animationDuration: 2 + Math.random() * 3 + 's',
        animationDelay: Math.random() * 2 + 's',
        color: ['#A5B4FC', '#FCD34D', '#FCA5A5', '#6EE7B7', '#D8B4FE', '#93C5FD'][Math.floor(Math.random() * 6)],
        isCircle: i % 2 === 0
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute top-[-50px] animate-fall"
                    style={{
                        left: piece.left,
                        animationDuration: piece.animationDuration,
                        animationDelay: piece.animationDelay,
                    }}
                >
                    <div 
                        className={`opacity-80 shadow-sm ${piece.isCircle ? 'rounded-full w-3 h-3' : 'rounded-sm w-3 h-4'} transform rotate-${Math.floor(Math.random() * 45)}`} 
                        style={{ backgroundColor: piece.color }}
                    ></div>
                </div>
            ))}
            {/* Injectem estils per animar la pluja de confetti */}
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-50px) rotate(0deg) scale(0.5); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg) scale(1.2); opacity: 0; }
                }
                .animate-fall {
                    animation-name: fall;
                    animation-timing-function: ease-in;
                    animation-iteration-count: 1; 
                }
            `}</style>
        </div>
    );
};

/**
 * COMPONENT PÀGINA: DemoTest
 * ----------------------------------------------------------------------
 * Propòsit: Mostrar un qüestionari en forma de "màquina d'estats".
 * Hi ha diverses pantalles (intro, p1, p2, carregant, resultat) i nosaltres només
 * canviem la variable 'step' per ensenyar una pantalla o una altra sense recarregar.
 */
export default function DemoTest() {
    // 1. GESTIÓ D'ESTATS (El cor de les Interfícies React)

    // 'step' defineix quina pantalla estem veient ara mateix. Valors: intro, q1, q2, loading, result.
    const [step, setStep] = useState('intro');

    // Un missatge dinàmic que canviarà mentre simulem estar "calculant" el match
    const [loadingMsg, setLoadingMsg] = useState('Analitzant el teu estil de vida...');

    // Apagat per defecte, l'encenem per llençar confetti de gosset
    const [showConfetti, setShowConfetti] = useState(false);

    // Guardem les respostes de l'usuari en un objecte (com en un carret de compra, però del test!)
    const [answers, setAnswers] = useState({
        housing: '', // Ex: "Pis" o "Casa"
        activity: '' // Ex: "Actiu" o "Relax"
    });

    /**
     * EFECTE DE CÀRREGA VISUAL (Només s'activa quan entrem a la pantalla "loading")
     */
    useEffect(() => {
        // Només fem coses si estem a la fase de càrrega
        if (step === 'loading') {

            // Llista de frases divertides que aniran canviant (feedback d'espera)
            const messages = [
                "Buscant cues que s'agitin per tu...",
                "Analitzant compatibilitat...",
                "Connectant amb les protectores...",
                "Preparant el teu match..."
            ];
            let i = 0;

            // Cada 1200 mil·lisegons (1.2s), avancem a la següent frase de la llista "messages"
            const msgInterval = setInterval(() => {
                i = (i + 1) % messages.length; // El "%" (mòdul) fa que tornem al 0 en acabar
                setLoadingMsg(messages[i]);
            }, 1200);

            // Després de 4.5 segons, diem: S'A CABAT D'ESPERAR! Mostra resultats.
            const finishTimeout = setTimeout(() => {
                clearInterval(msgInterval);  // Parem de canviar el text
                setStep('result');           // Canviem l'estat global a Resultat!
                setShowConfetti(true);       // Activa el confetti
            }, 4500);

            // Tota funció d'escombreries al finalitzar (neteja de React)
            return () => {
                clearInterval(msgInterval);
                clearTimeout(finishTimeout);
            };
        }
    }, [step]); // Li fem vigilar a React si el valor 'step' ha canviat.

    /**
     * Funció auxiliar fletxa petita per canviar el pastís.
     * Ens permet escriure handleNext('loading') en comptes de posar tot el "setStep(...)" en el HTML dirèctament.
     */
    const handleNext = (nextStep) => {
        setStep(nextStep);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col font-sans text-gray-900">
            {/* Capçalera Falsa de Demostració per poder tornar enrere */}
            <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">MatchCota</span>
                </Link>
                <div className="text-sm text-indigo-400 font-medium tracking-wide">DEMO MODE</div>
            </header>

            <main className="flex-grow flex items-center justify-center p-4">

                {/* --- PANTALLA INTRODUCCIÓ --- */}
                {/* Aquesta part HTML NOMÉS ('&&') es pinta en pantalla si l'estat és 'intro'. */}
                {step === 'intro' && (
                    <div className="bg-white rounded-[40px] shadow-2xl p-10 md:p-14 max-w-3xl w-full text-center animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>

                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                            Troba el teu company ideal
                        </h1>
                        <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-xl mx-auto">
                            Respon unes preguntes sobre el teu estil de vida i et mostrarem els animals més compatibles amb tu.
                        </p>

                        <div className="bg-indigo-50 rounded-3xl p-6 mb-10 text-left mx-auto max-w-xl border border-indigo-100">
                            <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Què avaluarem?
                            </h3>
                            <ul className="space-y-2 text-indigo-700 text-base">
                                <li className="flex items-center gap-2">✓ El teu estil de vida i disponibilitat</li>
                                <li className="flex items-center gap-2">✓ El tipus d'habitatge (pis, casa, jardí...)</li>
                                <li className="flex items-center gap-2">✓ Experiència amb animals</li>
                            </ul>
                        </div>

                        {/* Botó per avançar la variable 'step' a 'q1' (Pregunta 1) */}
                        <button
                            onClick={() => handleNext('q1')}
                            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
                        >
                            Comença el test
                        </button>
                    </div>
                )}

                {/* --- PANTALLA PREGUNTA 1 --- */}
                {step === 'q1' && (
                    <div className="bg-white rounded-[40px] shadow-xl p-10 md:p-14 max-w-3xl w-full animate-fade-in mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pregunta 1 de 2</span>
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                {/* Barra de progrés: 50% */}
                                <div className="h-full w-1/2 bg-indigo-500 rounded-full"></div>
                            </div>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Com és la teva llar?</h2>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-10">
                            {/* Bucle (map) per generar botons per a cada opció d'habitatge automàticament */}
                            {['Pis petit', 'Pis gran', 'Casa adossada', 'Casa amb terreny'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setAnswers({ ...answers, housing: opt })}
                                    className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex flex-col items-start gap-3 group ${answers.housing === opt
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md'
                                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers.housing === opt ? 'border-indigo-500' : 'border-gray-300'}`}>
                                        {answers.housing === opt && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                                    </div>
                                    <span className="font-semibold text-base">{opt}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-auto border-t pt-6">
                            <button onClick={() => setStep('intro')} className="text-gray-400 hover:text-gray-600 font-medium text-base flex items-center gap-2">← Enrere</button>
                            <button
                                onClick={() => handleNext('q2')}
                                disabled={!answers.housing} // Bloquegem (no deixem avançar) si NO hi ha respostes guardades
                                className={`px-8 py-3 text-base rounded-full font-bold transition-all ${answers.housing
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Següent
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PANTALLA PREGUNTA 2 --- */}
                {/* Lògica calcada a la Question 1, però actualitzant "answers.activity". */}
                {step === 'q2' && (
                    <div className="bg-white rounded-[40px] shadow-xl p-10 md:p-14 max-w-3xl w-full animate-fade-in mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pregunta 2 de 2</span>
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                {/* Barra de progrés: 100% */}
                                <div className="h-full w-full bg-indigo-500 rounded-full"></div>
                            </div>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">El teu nivell d'activitat?</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
                            {['Sofà i manta (Relax)', 'Passejos tranquils (Moderat)', "M'encanta l'esport (Actiu)"].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setAnswers({ ...answers, activity: opt })}
                                    className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all flex flex-col items-start gap-3 group ${answers.activity === opt
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md'
                                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers.activity === opt ? 'border-indigo-500' : 'border-gray-300'
                                        }`}>
                                        {answers.activity === opt && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                                    </div>
                                    <span className="font-semibold text-base">{opt}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-auto border-t pt-6">
                            <button onClick={() => setStep('q1')} className="text-gray-400 hover:text-gray-600 font-medium text-base flex items-center gap-2">← Enrere</button>
                            <button
                                // Aquest botó porta a l'estat d'Esperar ("loading")
                                onClick={() => handleNext('loading')}
                                disabled={!answers.activity}
                                className={`px-8 py-3 text-base rounded-full font-bold transition-all ${answers.activity
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Finalitzar i veure Match
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PANTALLA DE CÀRREGA (LOADING) --- */}
                {/* L'animació d'espera on l'useEffect d'amunt farà la seva feina */}
                {step === 'loading' && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl p-14 max-w-lg w-full text-center flex flex-col items-center justify-center animate-fade-in border border-white/50">
                        {/* Custom Pulse Animation */}
                        <div className="relative w-32 h-32 mb-8">
                            <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20"></div>
                            <div className="absolute inset-4 bg-purple-200 rounded-full animate-ping opacity-40" style={{ animationDelay: '0.3s' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-16 h-16 text-indigo-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-800 mb-2 transition-opacity duration-300">
                            Un moment...
                        </h3>
                        {/* {loadingMsg} s'actualitzarà periòdicament gràcies a l'useEffect que hem escrit i preparat abans! */}
                        <p className="text-indigo-600 font-medium text-lg animate-pulse">
                            {loadingMsg}
                        </p>
                    </div>
                )}

                {/* --- PANTALLA VICTÒRIA! (RESULTAT MATCH) --- */}
                {step === 'result' && (
                    <>
                        {/* Llença l'animació de confeti normal volant només aquí */}
                        {showConfetti && <NormalConfetti />}

                        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden max-w-7xl w-full animate-slide-up mx-auto relative z-10 border-4 border-indigo-100 flex flex-col items-center flex-grow m-4">

                            {/* Match Header */}
                            <div className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 md:p-12 text-center text-white relative flex flex-col items-center justify-center">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold flex items-center gap-3">
                                    ÉS UN MATCH PERFECTE
                                </h1>
                                <p className="text-white/90 text-lg mt-3 font-medium">
                                    Aquests són els animals més compatibles amb tu. T'estaven esperant!
                                </p>
                            </div>

                            <div className="p-8 lg:p-14 w-full flex flex-col lg:flex-row gap-8 lg:gap-12 flex-grow">
                                {/* MAIN MATCH CARD - Mostrem el principal a l'esquerra */}
                                <div className="w-full lg:w-3/5 xl:w-2/3 bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100/50 flex flex-col md:flex-row gap-8 shadow-sm">
                                    <div className="w-full md:w-1/2 aspect-square bg-slate-200 rounded-3xl overflow-hidden shadow relative group mx-auto md:mx-0 max-w-[400px]">
                                        {/* Image Placeholder */}
                                        <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500 animate-pulse">
                                            <span className="text-base font-medium">Foto de la Luna</span>
                                        </div>
                                        <div className="absolute top-4 right-4 bg-white text-indigo-900 px-4 py-1.5 rounded-full text-sm font-bold shadow flex items-center gap-1.5">
                                            ⭐ 98% Afinitat
                                        </div>
                                    </div>
                                    <div className="w-full md:w-1/2 flex flex-col py-4">
                                        <div>
                                            <div className="text-indigo-600 text-sm font-bold uppercase mb-2 tracking-widest inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 rounded-lg">Match Principal</div>
                                            <h2 className="text-5xl font-extrabold text-gray-900 mb-2 mt-2">LUNA</h2>
                                            <p className="text-lg text-gray-500 font-medium mb-6">Border Collie · 5 Anys · Femella</p>
                                        </div>

                                        <p className="text-indigo-900/80 text-lg leading-relaxed mb-8 flex-grow">
                                            Una energia que encaixa perfectament amb el teu estil de vida. És carinyosa i busca l'aventura donades les teves preferències.
                                        </p>

                                        <div className="mt-auto flex flex-col gap-4">
                                            <button className="w-full bg-indigo-600 text-white py-4 xl:py-5 rounded-2xl font-bold text-lg shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all hover:-translate-y-1">
                                                Concerta Visita amb la Luna
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* SECONDARY MATCHES - A la dreta llistats menuts */}
                                <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col gap-5 justify-center">
                                    <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Altres amics genials</h3>

                                    {/* Milo */}
                                    <div className="flex gap-5 p-4 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-indigo-200 transition-all hover:bg-gray-50">
                                        <div className="w-24 h-24 bg-gray-200 rounded-2xl flex-shrink-0 relative overflow-hidden">
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm">
                                                85%
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center flex-grow">
                                            <h4 className="font-bold text-xl text-gray-900">Milo</h4>
                                            <p className="text-sm text-gray-500 mb-3 font-medium">2 Anys · Mestís</p>
                                            <button className="text-indigo-600 text-sm font-bold hover:text-indigo-800 text-left flex items-center gap-1">
                                                Veure el seu perfil <span aria-hidden="true">&rarr;</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rocky */}
                                    <div className="flex gap-5 p-4 rounded-3xl bg-white shadow-sm border border-gray-100 hover:border-indigo-200 transition-all hover:bg-gray-50">
                                        <div className="w-24 h-24 bg-gray-200 rounded-2xl flex-shrink-0 relative overflow-hidden">
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm">
                                                72%
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center flex-grow">
                                            <h4 className="font-bold text-xl text-gray-900">Rocky</h4>
                                            <p className="text-sm text-gray-500 mb-3 font-medium">8 Anys · Beagle</p>
                                            <button className="text-indigo-600 text-sm font-bold hover:text-indigo-800 text-left flex items-center gap-1">
                                                Veure el seu perfil <span aria-hidden="true">&rarr;</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <footer className="p-6 text-center text-gray-400 text-xs">
                © 2026 MatchCota Demo
            </footer>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.5s ease-out; }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
