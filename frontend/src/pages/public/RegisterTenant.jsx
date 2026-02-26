// Hooks bàsics de react
import { useState } from 'react';
// Navegació interna pels enllaços
import { Link } from 'react-router-dom';
// Funció API independent per no dependre del context d'Usuari Loguejat (donat que és un formulari PÚBLIC)
import { createTenant } from '../../api/tenants';

/**
 * COMPONENT PÀGINA: RegisterTenant (Registre de Protectora)
 * ----------------------------------------------------------------------
 * Pàgina pública on una nova protectora (Tenant) pot omplir les seves
 * dades per donar-se d'alta al nostre sistema SaaS.
 */
export default function RegisterTenant() {
    // 1. ESTAT DEL FORMULARI MÚLTIPLE
    // Utilitzem un sol objecte per controlar els 9 camps, molt més net que 9 variables useState.
    const [formData, setFormData] = useState({
        name: '',
        slug: '',         // Identificador únic URL ('refugibcn')
        email: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        website: '',
        cif: '',
    });

    // Controls de la Interfície d'Usuari (està processant?, ha fallat?, ha anat bé?)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    /**
     * GESTOR DELS CAMPS DEL FORMULARI
     * Mapeja automàticament qualsevol lletra escrita a l'estat formData
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        // El 'prev' és la còpia exacta d'un mil·lisegon abans d'escriure
        setFormData((prev) => ({
            ...prev,        // Copia tots els camps actuals
            [name]: value,  // 'Písa' (sobrescriu) només el camp que s'acaba de tocar
        }));
    };

    /**
     * GESTOR D'ENVIAMENT PRINCIPAL AL BACKEND
     */
    const handleSubmit = async (e) => {
        // Evitar que la pàgina es recarregui
        e.preventDefault();

        // Activem la rodeta de pensar i netegem missatges antics
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Cridem la funció pura d'API (sense JWT, perquè justament s'estan registrant)
            await createTenant(formData);

            // Si tot va bé, el back ens ha creat l'entitat
            setSuccess(true);

            // Buidem el formulari completament
            setFormData({
                name: '', slug: '', email: '', address: '',
                city: '', postal_code: '', phone: '', website: '', cif: '',
            });
        } catch (err) {
            // Si l'API responia amb un 400 (ex: El slug ja existeix)
            setError(err.message);
        } finally {
            // En qualsevol cas, apaguem la rodeta de pensar.
            setLoading(false);
        }
    };

    return (
        // CONTENIDOR PRINCIPAL: Pantalla dividida en dues meitats
        <div className="min-h-screen bg-white flex font-sans overflow-hidden">

            {/* ------------------------------------------------------------------ */}
            {/* COLUMNA ESQUERRA (1/2): BRANDING I INFO (Amagada en mòbils 'hidden lg:flex') */}
            {/* ------------------------------------------------------------------ */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#4A90A4] relative items-center justify-center p-12 overflow-hidden">

                {/* ONDES DE FONS (Element 100% decoratiu SVG semi transparent) */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,0 L100,0 L100,100 Z" fill="white" />
                    </svg>
                </div>

                {/* TEXTOS BRANDING PRINCIPALS */}
                <div className="relative z-10 max-w-lg text-white">
                    <div className="mb-12">
                        {/* El link torna a l'Inici públic */}
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <span className="text-3xl font-bold tracking-tight">MatchCota</span>
                        </Link>
                    </div>

                    <h1 className="text-5xl font-extrabold leading-tight mb-8">
                        L'inici d'una nova vida per a cada animal.
                    </h1>

                    {/* Llistat Beneficis (Renderitzat iterativament per estalviar codi HTML) */}
                    <ul className="space-y-6">
                        {[
                            { title: 'Gestió intel·ligent', desc: 'Troba l\'adoptant ideal amb el nostre sistema de matching.' },
                            { title: 'Estalvi de temps', desc: 'Automatitza processos i centra\'t en la cura dels animals.' },
                        ].map((item, i) => (
                            <li key={i} className="flex gap-4 items-start">
                                <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    <p className="text-white/80 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* EMPREMTA FANTASMA DECORATIVA (Sota-Dreta) */}
                <div className="absolute -bottom-20 -right-20 opacity-10 transform -rotate-12 pointer-events-none">
                    <svg className="w-96 h-96 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 11.5c.6 0 1.2.2 1.7.5.5-2 2-3.5 4.3-3.5 2.5 0 4.5 1.8 4.5 4.5 0 2.2-2.7 5.7-6 9-1.9 2-3.5 2-4.5 2s-2.6 0-4.5-2c-3.3-3.3-6-6.8-6-9 0-2.7 2-4.5 4.5-4.5 2.3 0 3.8 1.5 4.3 3.5.5-.3 1.1-.5 1.7-.5z" />
                    </svg>
                </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* COLUMNA DRETA (1/2 o 1/1): FORMULARI INTERACTIU */}
            {/* ------------------------------------------------------------------ */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-gray-50/30">
                <div className="max-w-xl w-full">

                    {/* LOGO VERSIÓ MÒBIL (S'amaga en Desktop per no repetir el de l'esquerra) */}
                    <div className="lg:hidden mb-10 text-center">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#4A90A4] rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-[#4A90A4]">MatchCota</span>
                        </Link>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Crea el teu compte</h2>
                        <p className="text-gray-500 font-medium tracking-tight">
                            Comença avui mateix i dóna vida al teu espai digital.
                        </p>
                    </div>

                    {/* Malla CSS de 2 columnes ('grid-cols-2') per posar camps l'un al costat de l'altre */}
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-6" onSubmit={handleSubmit}>

                        {/* NOM ENTITAT (Columna sencera 'col-span-2') */}
                        <div className="md:col-span-2">
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Nom de l'entitat</label>
                            <input
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Protectora d'Animals..."
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* SLUG URL PÚBLICA (Columna sencera) */}
                        <div className="md:col-span-2">
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Identificador Web</label>
                            {/* Camp especial que te text flotant informatiu DINS l'input */}
                            <div className="relative group">
                                <input
                                    name="slug"
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={handleChange}
                                    placeholder="la-teva-entitat"
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 pr-32 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                                />
                                {/* Text '.matchcota.com' flotant a la dreta */}
                                <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none text-gray-300 font-bold group-focus-within:text-[#4A90A4]">
                                    .matchcota.com
                                </div>
                            </div>
                        </div>

                        {/* CORREU ELECTRÒNIC (Columna sencera) */}
                        <div className="md:col-span-2">
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Email professional</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="exempe@entitat.cat"
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* CIF (Mida Mitja Columna) */}
                        <div>
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">CIF</label>
                            <input
                                name="cif"
                                type="text"
                                value={formData.cif}
                                onChange={handleChange}
                                placeholder="G-12345678"
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* TELÈFON (Mida Mitja Columna) */}
                        <div>
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Telèfon</label>
                            <input
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+34..."
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* CIUTAT (Mida Mitja Columna) */}
                        <div>
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Ciutat</label>
                            <input
                                name="city"
                                type="text"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Barcelona"
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* LLOC WEB (Mida Mitja Columna) */}
                        <div>
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Lloc Web</label>
                            <input
                                name="website"
                                type="url"
                                placeholder="https://..."
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-[#4A90A4] focus:outline-none transition-all duration-300 shadow-sm hover:border-gray-200"
                            />
                        </div>

                        {/* BLOC RESULTATS (Errors i Èxits) */}
                        <div className="md:col-span-2 mt-4">

                            {/* Si error té valor, paintem requadre vermell */}
                            {error && (
                                <div className="text-red-500 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 mb-6 flex gap-3 animate-shake">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    {error}
                                </div>
                            )}

                            {/* Si tot ha anat bé, paintem requadre turquesa corporatiu */}
                            {success && (
                                <div className="text-[#4A90A4] text-sm font-bold bg-[#4A90A4]/10 p-4 rounded-xl border border-[#4A90A4]/20 mb-6 flex gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Protectora creada correctament! Benvinguts.
                                </div>
                            )}

                            {/* BOTÓ FINAL DE SUBMIT */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#4A90A4] text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-[#4A90A4]/20 hover:bg-[#3a7c8d] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                            >
                                {loading ? 'Enviant...' : 'Registrar ara'}
                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        </div>
                    </form>

                    {/* REDIRECCIÓ AL LOGIN SI L'USUARI S'HI HA COLAT SENSE VOLER */}
                    <p className="mt-10 text-center text-gray-500 font-bold">
                        Ja formes part de MatchCota?{' '}
                        <Link to="/login" className="text-[#4A90A4] hover:text-[#3a7c8d] underline decoration-2 underline-offset-8 transition-all">
                            Inicia sessió
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
