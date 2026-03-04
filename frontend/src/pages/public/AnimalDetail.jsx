// Hooks clàssics de memòria i reaccions
import { useState, useEffect } from 'react';
// useParams ens permet extreure l'ID de la URL actual (exemple: recuperar "928" de "/animals/928")
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useApi } from '../../hooks/useApi';

/**
 * COMPONENT PÀGINA: AnimalDetail (Fitxa detallada)
 * ----------------------------------------------------------------------
 * Propòsit: A diferència del component anterior (q ensenyava una llista d'animals),
 * aquest demana un objecte Animal SENCER i únic al backend i te l'ensenya a tota pantalla.
 */
export default function AnimalDetail() {
    // 1. OBTENIR PARÀMETRES DE NAVEGACIÓ
    // La nostra ruta de ReactRouter deia "/animals/:id". useParams "pesca" per nosaltres
    // l'objecte especial i la variable "id" es crida doncs així com ho vam declarar.
    const { id } = useParams();

    // 2. GESTIÓ D'ESTATS
    // Aquí no guardem corxets blaus [], sinó la paraula reservada 'null' (buit total)
    // Ja que aquí només ens interessa obtenir UN animal individual com un objecte.
    const [animal, setAnimal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const api = useApi();

    /**
     * EFECTE DESCARTAT UN COP
     * Entrem a demanar les dades i l'Efecte vol saber quines dades.
     */
    useEffect(() => {
        // Obtenim demanant de la URL "/animals/id". Substituint la URL
        const fetchAnimal = async () => {
            try {
                // Aquí fas l'equivalent a buscar el llibre per ID! "/animals/59800"
                const data = await api.get(`/animals/${id}`);
                setAnimal(data); // El desem.
            } catch (err) {
                // Si la petició fracassa.
                setError("No s'ha pogut carregar l'animal.");
            } finally {
                // Finalitzem que ara no depén del resultat si es bo o dolent. Netejar.
                setLoading(false);
            }
        };

        // Quan es compleixi la variable ID... crida'l. (Com que és obligat, es farà).
        if (id) {
            fetchAnimal();
        }
    }, [id]); // Aquest cop si la URL muta o canvia l'ID tornem a carregar l'esdeveniment

    // 3. RENDERITZAT ESCALONAT I CONDICIONAL
    // Sempre ens defensem d'haver de mostrar errors primer.

    // A. Mentre pensem... -> Ensenyar pantalla d'espera i Sortir
    if (loading) return <div className="text-center py-10">Carregant detalls...</div>;
    // B. Si es queixa...   -> Ensenyar la queixa el error i Sortir
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    // C. El servidor ens ha enganyat i no ens dóna cap dada? (Comprovar) 
    if (!animal) return <div className="text-center py-10">Animal no trobat</div>;

    // D. SI hem arribat tan avall i res ens ha aturat el codi...
    // Retornem el codi final mostrant a l'Usuari l'Element. Endavant!
    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">

            {/* CAPÇALERA DEL DETALL. EL SEU NOM I BOTÓ ENRERE. */}
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {/* Pintem el nom */}
                        {animal.name}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {animal.species}{animal.breed ? ` - ${animal.breed}` : ''}
                    </p>
                </div>
                {/* Aquest simple botó Link emula l'history dels navegadors i fa referència del Pare.*/}
                <Link to="/animals">
                    <Button variant="secondary">Tornar</Button>
                </Link>
            </div>

            {/* FOTOGRAFIA GRAN DETALLADA (Només es fa si la llista de fotos te mida>0) */}
            {animal.photo_urls?.[0] && (
                <div className="px-4 sm:px-6">
                    <img
                        className="w-full max-h-96 object-cover rounded-lg"
                        src={animal.photo_urls[0]}
                        alt={animal.name}
                    />
                </div>
            )}

            {/* FITXA TÈCNICA. ESTRUCTURA 'Table' DE FILES, QUE LLEGEIX L'OBJECTE EN DESÚS DEL FORMULARI */}
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">

                    {/* Sempre hi es el nom i espècie*/}
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Nom</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.name}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Especie</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.species}</dd>
                    </div>

                    {/* I ara cadascuna amb elements OPCIONALS com fem servir en els botons per evitar problemes */}

                    {/* Si tenim la Raça i s'ha complerit prèviament o guardat previament (!=nulo) ensenya aquest bloc div*/}
                    {animal.breed && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Raca</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.breed}</dd>
                        </div>
                    )}

                    {animal.sex && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Sexe</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.sex}</dd>
                        </div>
                    )}

                    {animal.birth_date && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Data Naixement</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.birth_date}</dd>
                        </div>
                    )}

                    {animal.size && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Mida</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.size}</dd>
                        </div>
                    )}

                    {animal.weight_kg && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Pes</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.weight_kg} kg</dd>
                        </div>
                    )}

                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Descripció</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {/* Si te text enseña'l. Alternativa amb or logic '||' -> enseña directament "Sense descripcio..." */}
                            {animal.description || 'Sense descripció disponible'}
                        </dd>
                    </div>

                    {animal.medical_conditions && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Condicions mediques</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.medical_conditions}</dd>
                        </div>
                    )}
                </dl>
            </div>
        </div>
    );
}
