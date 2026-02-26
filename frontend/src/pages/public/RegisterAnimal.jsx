// Estat de React essencial pel formulari
import { useState } from 'react';
// Hooks propis i externs necessaris
import { useApi } from '../../hooks/useApi'; // Per peticions autenticades
import { useAuth } from '../../hooks/useAuth'; // Per saber qui ets
import { useNavigate } from 'react-router-dom';

/**
 * COMPONENT PÀGINA: RegisterAnimal (Afegir Animal)
 * ----------------------------------------------------------------------
 * Aquest és el formulari per donar d'alta un nou animal al sistema per la reserva i
 * compatibilitat de test posteriors!
 */
export default function RegisterAnimal() {
    // 1. CARREGUEM EINES CLAU
    const api = useApi();

    // Obtenim 'user' del context global. Ens servirà per protegir o denegar.
    const { user } = useAuth();
    const navigate = useNavigate();

    // 2. CREANT UN MEGA ESTAT LOCAL 
    // Com tenim MOLTS camps, fem un objecte sencer on guardem tot el q s'escrigui!
    const [formData, setFormData] = useState({
        name: '',
        species: 'dog', // Inicial per defecte 'Gos'
        breed: '',
        sex: 'male',    // Inicial per defecte 'Mascle'
        size: '',
        weight_kg: '',
        description: '',
        medical_conditions: '',
    });

    // Controls de càrrega UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    /**
     * MODIFICANT ESTAT GENERAL DE FORMA MÀGICA [Truquet React]
     * S'activa a la pròpia crida d'un camp q ha rebut 'tecles'.
     */
    const handleChange = (e) => {
        // Separem per descomposició (destructuring) el 'NOM' del input i el seu VALOR q just escriu l'usuari.
        const { name, value } = e.target;

        // Cridem al hook, agafem el que TINDRIEM DE CADA camp just ABANS ('prev'), copiem amb '...'
        // Sobreescribim dinàmicament NOMÉS el [name] ('breed','pes',etc.) que s'ha modificat per assignar el 'value' escrit.
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /**
     * PROCES DE DONAR D'ALTA (ON SUBMIT FORMULARIO MÚLTIPLE)
     */
    const handleSubmit = async (e) => {
        // Sense aixo la plana es refrescaria i ho perdria tot
        e.preventDefault();

        // VALIDACIÓ SIMPLE. Protegir el formulari manualment de gent sense auteticar?
        if (!user) {
            setError("Has d'iniciar sessió per registrar un animal.");
            return;
        }

        // Activem els loading per evitar crida de 5 clicks seguits fins que tinguem ok previ
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // FORMATAT I CASTEIG ABANS DE LA XARXA (Body = El paquet XML/JSON d'Enviament)
            // L'[API backend] requereix en els seus criteris que les cadenes "buides" ('' de l'inici)
            // arribin interpretades correctament en formularis com a NULL perquè sinó l'API falla en camps MySQL opcionals.
            // A més prenem que certs elements són Flotants parsejats.
            const body = {
                name: formData.name,
                species: formData.species,
                breed: formData.breed || null,  // Si està buit, li donem Null per dalt.
                sex: formData.sex || null,
                size: formData.size || null,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                description: formData.description || null,
                medical_conditions: formData.medical_conditions || null,
            };

            // Fem el POST mitjançant el Hook que sabem segur que envia JWT
            // Ho demana exactament cap la ruta d'administradors "/admin/animals" i passem l'Objecte de variables convertides
            await api.post('/admin/animals', body);

            // Si la promesa dóna resolta i arriba... OK!!
            setSuccess(true);

            // Reiniciem form deixant de forma que es pugui pujar nou exemplar caní fàcil
            setFormData({
                name: '', species: 'dog', breed: '', sex: 'male',
                size: '', weight_kg: '', description: '', medical_conditions: ''
            });
        } catch (err) {
            // Un error general posat al try
            setError(err.message);
        } finally {
            // Aturar Spinners carregues
            setLoading(false);
        }
    };

    // 3. RENDERITZA PROTECCIÓ
    // Si entres manualment amb el router pel buscador fins aquí sense TOKEN valid, mostrem Codi que no deixa anar endavant per seguretat a nivell d'Experiència Visual Client
    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Accés restringit</h2>
                <p className="text-gray-600 mb-4">Has d'iniciar sessió per afegir animals.</p>
                {/* Botó per dur el Client cap on sí pugi aconseguir permisos */}
                <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Iniciar sessió
                </button>
            </div>
        );
    }

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* TITOL I SUBTITOL */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Afegir nou animal</h2>
                    <p className="text-gray-600">Introdueix les dades per trobar la familia ideal</p>
                </div>

                {/* FORMULARI BASE */}
                {/* Executa l'handleSubmit dissenyat i no l'esdeveniment estàndard q ho envia fora i aturada general. */}
                <form className="bg-white shadow-sm rounded-xl p-6 space-y-6 border border-gray-100" onSubmit={handleSubmit}>

                    {/* Bloc amb Malla de 2 columnes generals d'Inputs HTML5 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* 1. NOM (Obligatori amb el "required") */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom de l'animal *</label>
                            <input name="name" type="text" required value={formData.name} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        {/* 2. ESPÈCIE (Select Obligat però ple de "Dog") */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Especie *</label>
                            <select name="species" value={formData.species} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="dog">Gos</option>
                                <option value="cat">Gat</option>
                                <option value="other">Altre</option>
                            </select>
                        </div>

                        {/* 3. RAÇA */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Raca</label>
                            <input name="breed" type="text" value={formData.breed} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        {/* 4. SEXE */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sexe</label>
                            <select name="sex" value={formData.sex} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="male">Mascle</option>
                                <option value="female">Femella</option>
                            </select>
                        </div>

                        {/* 5. MIDA */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mida</label>
                            <select name="size" value={formData.size} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="">Selecciona...</option>
                                <option value="small">Petit</option>
                                <option value="medium">Mitja</option>
                                <option value="large">Gran</option>
                            </select>
                        </div>

                        {/* 6. PES (Forcem flotant a l'HTML indicant "step='0.1'") */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pes (kg)</label>
                            <input name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    {/* Bloc ampliat 1: DESCRIPCIÓ LÍREMENT LLARGA */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripció i personalitat</label>
                        <textarea name="description" rows="4" value={formData.description} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Explica com es la seva personalitat..." />
                    </div>

                    {/* Bloc ampliat 2: SALUT I MEDICAMENTACIÓ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Condicions mediques</label>
                        <textarea name="medical_conditions" rows="2" value={formData.medical_conditions} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Alguna condició medica a tenir en compte?" />
                    </div>

                    {/* MISATGES ALERTANT RESULTATS D'ERROR I ÈXIT POSITIUS CONDICIONATS A STATE */}
                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}
                    {success && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">Animal registrat correctament!</div>}

                    {/* Submit del button on hi afegim control. Si "deshabilitat" és perquê el loading li tanca pas, i així baixa l'opacitat. */}
                    <div className="pt-4">
                        <button type="submit" disabled={loading}
                            className={`w-full py-3 px-4 rounded-md shadow-sm text-white font-semibold bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 ${loading ? 'opacity-50' : ''}`}>
                            {loading ? 'Guardant...' : 'Publicar animal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
