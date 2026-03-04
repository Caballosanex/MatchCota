// Estat de React essencial pel formulari
import { useState } from 'react';
// Hooks propis i externs necessaris
import { useApi } from '../../hooks/useApi'; // Per peticions autenticades
import { useAuth } from '../../hooks/useAuth'; // Per saber qui ets
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------
// IMPORTACIONS DE FORMULARIS AVANÇATS (REACT-HOOK-FORM + ZOD)
// ----------------------------------------------------------------------
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

/**
 * COMPONENT PÀGINA: RegisterAnimal (Afegir Animal)
 * ----------------------------------------------------------------------
 * PER QUÈ UTILITZEM ZOD I REACT-HOOK-FORM AQUÍ?
 * 
 * Abans teníem un immens "useState" on s'havia de capturar a mà cadascun
 * dels camps cada cop que l'usuari premia una tecla. Ara, a delegar-ho a 
 * react-hook-form, guanyem enorme rendiment. Zod ens fa d'escut impedint
 * que noms en blanc o valors incorrectes arribin al botó d'Enviar.
 */

// 1. DEFINIM "L'ESQUEMA" POLICIAL (El format exacte que acceptem)
const animalSchema = z.object({
    name: z.string().min(1, "El nom de l'animal és obligatori."),
    species: z.string().min(1, "L'espècie és obligatòria."),
    breed: z.string().optional(),
    sex: z.string().optional(),
    size: z.string().optional(),
    weight_kg: z.string().optional(), // Ho agafem com a string del HTML i després el passem a decimal.
    description: z.string().optional(),
    medical_conditions: z.string().optional(),
});

export default function RegisterAnimal() {
    // 1. CARREGUEM EINES CLAU
    const api = useApi();
    const { user } = useAuth();
    const navigate = useNavigate();

    // 2. CONNECTANT EL SUPER FORMULARI FRONT-END
    const {
        register,
        handleSubmit,
        reset, // Zod ens permet buidar de cop tot el form un cop enviat
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(animalSchema),
        defaultValues: {
            species: 'dog',
            sex: 'male',
            size: '',
            breed: '',
            weight_kg: '',
            description: '',
            medical_conditions: '',
        }
    });

    // Validacions de resultats Finals (Backend)
    const [apiError, setApiError] = useState(null);
    const [success, setSuccess] = useState(false);

    /**
     * PROCES DE DONAR D'ALTA (ON SUBMIT FORMULARIO MÚLTIPLE)
     * Si s'executa, vol dir que l'ESQUEMA ZOD de dalt dóna el Vist-i-plau!
     */
    const onSubmit = async (data) => {
        // Validació per seguretat extra
        if (!user) {
            setApiError("Has d'iniciar sessió per registrar un animal.");
            return;
        }

        setApiError(null);
        setSuccess(false);

        try {
            // FORMATAT I CASTEIG ABANS DE LA XARXA
            // Convertim cadenes buides "" en nulls per tal que la base de dades no plori.
            const body = {
                name: data.name,
                species: data.species,
                breed: data.breed || null,
                sex: data.sex || null,
                size: data.size || null,
                weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
                description: data.description || null,
                medical_conditions: data.medical_conditions || null,
            };

            await api.post('/admin/animals', body);

            // Èxit!
            setSuccess(true);

            // Esborрем tot el q havia escrit el client automàticament
            reset();
        } catch (err) {
            setApiError(err.message || "Hi ha hagut un problema al contactar amb el servidor.");
        }
    };

    // 3. RENDERITZA PROTECCIÓ (Foragitant intrusos de ruta manual)
    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Accés restringit</h2>
                <p className="text-gray-600 mb-4">Has d'iniciar sessió per afegir animals.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold"
                >
                    Iniciar sessió
                </button>
            </div>
        );
    }

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                {/* TITOL I SUBTITOL */}
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900">Afegir nou animal</h2>
                    <p className="text-gray-500 font-bold mt-2">Introdueix les dades per trobar la família ideal</p>
                </div>

                {/* FORMULARI BASE CONNECTAT A ZOD */}
                <form className="bg-white shadow-xl shadow-gray-200/50 rounded-2xl p-8 space-y-6 border border-gray-100" onSubmit={handleSubmit(onSubmit)}>

                    {/* Bloc amb Malla de 2 columnes generals d'Inputs HTML5 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* 1. NOM */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nom de l'animal *</label>
                            <input
                                type="text"
                                {...register('name')}
                                className={`block w-full px-4 py-3 border-2 rounded-xl text-gray-900 font-bold focus:bg-white transition-all
                                    ${errors.name ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-100 bg-gray-50 focus:border-indigo-500'}`}
                            />
                            {errors.name && <span className="text-red-500 text-xs font-bold mt-1 block">*{errors.name.message}</span>}
                        </div>

                        {/* 2. ESPÈCIE */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Especie *</label>
                            <select
                                {...register('species')}
                                className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all">
                                <option value="dog">Gos</option>
                                <option value="cat">Gat</option>
                                <option value="other">Altre</option>
                            </select>
                        </div>

                        {/* 3. RAÇA */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Raça</label>
                            <input
                                type="text"
                                {...register('breed')}
                                className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* 4. SEXE */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Sexe</label>
                            <select
                                {...register('sex')}
                                className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all">
                                <option value="male">Mascle</option>
                                <option value="female">Femella</option>
                            </select>
                        </div>

                        {/* 5. MIDA */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Mida</label>
                            <select
                                {...register('size')}
                                className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all">
                                <option value="">Selecciona...</option>
                                <option value="small">Petit</option>
                                <option value="medium">Mitjà</option>
                                <option value="large">Gran</option>
                            </select>
                        </div>

                        {/* 6. PES (Forcem flotant a l'HTML indicant "step='0.1'") */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Pes (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                {...register('weight_kg')}
                                className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Bloc ampliat 1: DESCRIPCIÓ LÍREMENT LLARGA */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Descripció i personalitat</label>
                        <textarea
                            rows="4"
                            {...register('description')}
                            className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all"
                            placeholder="Explica com és la seva personalitat..."
                        />
                    </div>

                    {/* Bloc ampliat 2: SALUT I MEDICAMENTACIÓ */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Condicions mediques</label>
                        <textarea
                            rows="2"
                            {...register('medical_conditions')}
                            className="block w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 focus:bg-white rounded-xl text-gray-900 font-bold focus:border-indigo-500 transition-all"
                            placeholder="Alguna condició mèdica a tenir en compte?"
                        />
                    </div>

                    {/* MISATGES ALERTANT RESULTATS D'ERROR I ÈXIT POSITIUS CONDICIONATS A STATE */}
                    {apiError && (
                        <div className="text-red-600 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            {apiError}
                        </div>
                    )}
                    {success && (
                        <div className="text-green-600 text-sm font-bold bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Animal registrat correctament a la base de dades!
                        </div>
                    )}

                    {/* Submit del button on hi afegim control. Si isSubmitting, tanca pas automatically per Zod. */}
                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-4 bg-indigo-600 text-white font-black text-lg py-4 rounded-xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? 'Pujant a la xarxa...' : 'Publicar animal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
