import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/admin/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError('Credencials incorrectes');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Header (Simplified) */}
            <div className="p-8">
                <Link to="/" className="inline-flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#4A90A4] rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold text-[#4A90A4]">MatchCota</span>
                </Link>
            </div>

            <div className="flex-grow flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    <div className="mb-12">
                        <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Benvingut/da</h2>
                        <p className="text-gray-400 font-bold tracking-tight">
                            Accedeix al teu panell de control per continuar gestionant les teves adopcions.
                        </p>
                    </div>

                    <form className="space-y-8" onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <div className="relative group">
                                <label className="text-[11px] font-black text-[#4A90A4] uppercase tracking-widest mb-2 block ml-1">Correu electrònic</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="hola@la-teva-entitat.com"
                                    className="w-full bg-transparent border-b-2 border-gray-100 py-3 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300"
                                />
                            </div>

                            <div className="relative group">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-black text-[#4A90A4] uppercase tracking-widest block ml-1">Contrasenya</label>
                                    <a href="#" className="text-[11px] font-black text-gray-300 uppercase tracking-widest hover:text-[#4A90A4] transition-colors">Has oblidat la clau?</a>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-transparent border-b-2 border-gray-100 py-3 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 font-bold text-gray-900 placeholder-gray-300"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-xs font-bold flex gap-2 items-center animate-shake">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                {error}
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full bg-[#4A90A4] text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-[#4A90A4]/20 hover:bg-[#3a7c8d] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group"
                            >
                                Entrar ara
                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        </div>
                    </form>

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

            {/* Footer decoration */}
            <div className="h-2 bg-gradient-to-r from-[#4A90A4] to-indigo-100"></div>
        </div>
    );
}
