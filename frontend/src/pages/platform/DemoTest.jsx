import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// --- ICONS & ASSETS ---
const PawConfetti = () => {
    // Generate some random positions for the confetti
    const paws = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        animationDuration: 2 + Math.random() * 3 + 's',
        animationDelay: Math.random() * 2 + 's',
        color: ['#A5B4FC', '#FCD34D', '#FCA5A5', '#6EE7B7'][Math.floor(Math.random() * 4)] // Soft pastel colors
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {paws.map((paw) => (
                <div
                    key={paw.id}
                    className="absolute top-[-50px] animate-fall"
                    style={{
                        left: paw.left,
                        animationDuration: paw.animationDuration,
                        animationDelay: paw.animationDelay,
                        color: paw.color
                    }}
                >
                    <svg className="w-6 h-6 transform rotate-12 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 11.5c.6 0 1.2.2 1.7.5.5-2 2-3.5 4.3-3.5 2.5 0 4.5 1.8 4.5 4.5 0 2.2-2.7 5.7-6 9-1.9 2-3.5 2-4.5 2s-2.6 0-4.5-2c-3.3-3.3-6-6.8-6-9 0-2.7 2-4.5 4.5-4.5 2.3 0 3.8 1.5 4.3 3.5.5-.3 1.1-.5 1.7-.5z" />
                    </svg>
                </div>
            ))}
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-50px) rotate(0deg) scale(0.5); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg) scale(1.2); opacity: 0; }
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

export default function DemoTest() {
    const [step, setStep] = useState('intro'); // intro, q1, q2, loading, result
    const [loadingMsg, setLoadingMsg] = useState('Analitzant el teu estil de vida...');
    const [showConfetti, setShowConfetti] = useState(false);

    // Initial state for answers (not actually processed in this demo, but good for UI state)
    const [answers, setAnswers] = useState({
        housing: '',
        activity: ''
    });

    // Loading sequence
    useEffect(() => {
        if (step === 'loading') {
            const messages = [
                "Buscant cues que s'agitin per tu...",
                "Analitzant compatibilitat...",
                "Connectant amb les protectores...",
                "Preparant el teu match..."
            ];
            let i = 0;
            const msgInterval = setInterval(() => {
                i = (i + 1) % messages.length;
                setLoadingMsg(messages[i]);
            }, 1200);

            const finishTimeout = setTimeout(() => {
                clearInterval(msgInterval);
                setStep('result');
                setShowConfetti(true);
            }, 4500); // 4.5s loading time

            return () => {
                clearInterval(msgInterval);
                clearTimeout(finishTimeout);
            };
        }
    }, [step]);

    // Render helpers
    const handleNext = (nextStep) => {
        setStep(nextStep);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col font-sans text-gray-900">
            {/* Simple Header */}
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

                {/* --- INTRO SCREEN --- */}
                {step === 'intro' && (
                    <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-2xl w-full text-center animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>

                        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">
                            Troba el teu company ideal
                        </h1>
                        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                            Respon unes preguntes sobre el teu estil de vida i et mostrarem els animals més compatibles amb tu.
                        </p>

                        <div className="bg-indigo-50 rounded-2xl p-6 mb-10 text-left mx-auto max-w-lg border border-indigo-100">
                            <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Què avaluarem?
                            </h3>
                            <ul className="space-y-2 text-indigo-700 text-sm">
                                <li className="flex items-center gap-2">✓ El teu estil de vida i disponibilitat</li>
                                <li className="flex items-center gap-2">✓ El tipus d'habitatge (pis, casa, jardí...)</li>
                                <li className="flex items-center gap-2">✓ Experiència amb animals</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => handleNext('q1')}
                            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
                        >
                            Comença el test
                        </button>
                    </div>
                )}

                {/* --- QUESTION 1 --- */}
                {step === 'q1' && (
                    <div className="bg-white rounded-[40px] shadow-xl p-10 max-w-2xl w-full animate-fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pregunta 1 de 2</span>
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full w-1/2 bg-indigo-500 rounded-full"></div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mb-8">Com és la teva llar?</h2>

                        <div className="space-y-4 mb-10">
                            {['Pis petit (menys de 60m2)', 'Pis gran (més de 60m2)', 'Casa sense jardí', 'Casa amb jardí'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setAnswers({ ...answers, housing: opt })}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${answers.housing === opt
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="font-medium text-lg">{opt}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers.housing === opt ? 'border-indigo-500' : 'border-gray-300'
                                        }`}>
                                        {answers.housing === opt && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-center">
                            <button onClick={() => setStep('intro')} className="text-gray-400 hover:text-gray-600 font-medium">← Enrere</button>
                            <button
                                onClick={() => handleNext('q2')}
                                disabled={!answers.housing}
                                className={`px-8 py-3 rounded-full font-bold transition-all ${answers.housing
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Següent
                            </button>
                        </div>
                    </div>
                )}

                {/* --- QUESTION 2 --- */}
                {step === 'q2' && (
                    <div className="bg-white rounded-[40px] shadow-xl p-10 max-w-2xl w-full animate-fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pregunta 2 de 2</span>
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-indigo-500 rounded-full"></div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mb-8">El teu nivell d'activitat?</h2>

                        <div className="space-y-4 mb-10">
                            {['Sofà i manta (Relax)', 'Passejos tranquils (Moderat)', "M'encanta l'esport (Actiu)"].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setAnswers({ ...answers, activity: opt })}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${answers.activity === opt
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="font-medium text-lg">{opt}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers.activity === opt ? 'border-indigo-500' : 'border-gray-300'
                                        }`}>
                                        {answers.activity === opt && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-center">
                            <button onClick={() => setStep('q1')} className="text-gray-400 hover:text-gray-600 font-medium">← Enrere</button>
                            <button
                                onClick={() => handleNext('loading')}
                                disabled={!answers.activity}
                                className={`px-8 py-3 rounded-full font-bold transition-all ${answers.activity
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Finalitzar i veure Match
                            </button>
                        </div>
                    </div>
                )}

                {/* --- LOADING --- */}
                {step === 'loading' && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl p-16 max-w-lg w-full text-center flex flex-col items-center justify-center animate-fade-in border border-white/50">
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
                        <p className="text-indigo-600 font-medium text-lg animate-pulse">
                            {loadingMsg}
                        </p>
                    </div>
                )}

                {/* --- RESULT (MATCH) --- */}
                {step === 'result' && (
                    <>
                        {showConfetti && <PawConfetti />}
                        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden max-w-4xl w-full animate-slide-up mx-4 relative z-10 border-4 border-indigo-100">

                            {/* Match Header */}
                            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-center text-white relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIvPjwvc3ZnPg==')]"></div>
                                <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider mb-2">
                                    ÉS UN MATCH!
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-extrabold mb-2">
                                    Hem trobat el teu <br /> company ideal
                                </h1>
                                <p className="text-white/90">
                                    Segons el teu estil de vida i la personalitat dels nostres animals, hem trobat connexions especials. T'estaven esperant!
                                </p>
                            </div>

                            <div className="p-8 lg:p-12">
                                {/* MAIN MATCH CARD */}
                                <div className="flex flex-col lg:flex-row gap-8 items-center mb-16">
                                    <div className="w-full lg:w-1/2">
                                        <div className="aspect-square bg-slate-200 rounded-[30px] overflow-hidden shadow-lg relative group">
                                            {/* Image Placeholder */}
                                            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500 animate-pulse">
                                                <span className="text-sm">Foto de la Luna</span>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                                                <div className="bg-white/90 backdrop-blur text-indigo-900 px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                                    98% Compatible
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full lg:w-1/2 space-y-6">
                                        <div>
                                            <h2 className="text-4xl font-extrabold text-gray-900 mb-1">LUNA</h2>
                                            <p className="text-xl text-gray-500 font-medium">Border Collie · 5 Anys · Femella</p>
                                        </div>

                                        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                                            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                                Per què vosaltres?
                                            </h4>
                                            <p className="text-indigo-800/80 text-sm leading-relaxed">
                                                "La Luna té una energia que encaixa perfectament amb el teu estil de vida actiu. És intel·ligent, carinyosa i busca algú amb qui compartir llargues passejades, tal com has indicat!"
                                            </p>
                                        </div>

                                        <div className="flex gap-4">
                                            <button className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all">
                                                Concerta una visita
                                            </button>
                                            <button className="px-6 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                                ❤️
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* SECONDARY MATCHES */}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        Altres amics que t'encantaran
                                        <div className="h-px bg-gray-200 flex-1 ml-4"></div>
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Milo */}
                                        <div className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="w-24 h-24 bg-gray-200 rounded-2xl flex-shrink-0"></div>
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900">Milo, 2 Anys</h4>
                                                <p className="text-sm text-gray-500 mb-3">Mestís · Molt juganer</p>
                                                <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors">
                                                    Veure la seva història
                                                </button>
                                            </div>
                                        </div>

                                        {/* Rocky */}
                                        <div className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="w-24 h-24 bg-gray-200 rounded-2xl flex-shrink-0"></div>
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900">Rocky, 8 Anys</h4>
                                                <p className="text-sm text-gray-500 mb-3">Beagle · Tranquil i noble</p>
                                                <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors">
                                                    Veure la seva història
                                                </button>
                                            </div>
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
