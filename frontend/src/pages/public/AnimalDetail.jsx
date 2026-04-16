// Hooks clàssics de memòria i reaccions
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import PhotoGallery from '../../components/animals/PhotoGallery';
import MatchingBars from '../../components/animals/MatchingBars';
import { useApi } from '../../hooks/useApi';

// Traducció de valors a Català
const LABEL_MAP = {
    species: { dog: 'Gos', cat: 'Gat', other: 'Altre' },
    sex: { male: 'Mascle', female: 'Femella' },
    size: { small: 'Petit', medium: 'Mitja', large: 'Gran' },
};

// Component per files de detall
function DetailRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
        </div>
    );
}

/**
 * COMPONENT PÀGINA: AnimalDetail (Fitxa detallada)
 * ----------------------------------------------------------------------
 * Propòsit: A diferència del component anterior (q ensenyava una llista d'animals),
 * aquest demana un objecte Animal SENCER i únic al backend i te l'ensenya a tota pantalla.
 */
export default function AnimalDetail() {
    // 1. OBTENIR PARÀMETRES DE NAVEGACIÓ
    const { id } = useParams();
    // 2. GESTIÓ D'ESTATS
    const [animal, setAnimal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const api = useApi();

    useEffect(() => {
        const fetchAnimal = async () => {
            try {
                const data = await api.get(`/animals/${id}`);
                setAnimal(data);
            } catch (err) {
                setError("No s'ha pogut carregar l'animal.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchAnimal();
    }, [id]);

    // 3. RENDERITZAT ESCALONAT I CONDICIONAL
    if (loading) return <div className="text-center py-10">Carregant detalls...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!animal) return <div className="text-center py-10">Animal no trobat</div>;

    // 4. Disseny final: layout 2 columnes amb galeria, fitxa i barres
    return (
        <div className="space-y-6">
            {/* Capçalera i galeria */}
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {LABEL_MAP.species[animal.species] || animal.species}
                            {animal.breed ? ` - ${animal.breed}` : ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                            {animal.sex && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {LABEL_MAP.sex[animal.sex] || animal.sex}
                                </span>
                            )}
                            {animal.size && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {LABEL_MAP.size[animal.size] || animal.size}
                                </span>
                            )}
                            {animal.is_ppp && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    PPP
                                </span>
                            )}
                        </div>
                    </div>
                    <Link to="/animals">
                        <Button variant="secondary">Tornar</Button>
                    </Link>
                </div>
                <div className="px-4 sm:px-6 pb-4">
                    <PhotoGallery photos={animal.photo_urls} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info principal */}
                <div className="lg:col-span-2 bg-white shadow sm:rounded-lg">
                    <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                        <h2 className="text-lg font-medium text-gray-900">Informació</h2>
                    </div>
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <DetailRow label="Especie" value={LABEL_MAP.species[animal.species] || animal.species} />
                        <DetailRow label="Raca" value={animal.breed} />
                        <DetailRow label="Sexe" value={LABEL_MAP.sex[animal.sex]} />
                        <DetailRow label="Data Naixement" value={animal.birth_date} />
                        <DetailRow label="Mida" value={LABEL_MAP.size[animal.size]} />
                        <DetailRow label="Pes" value={animal.weight_kg ? `${animal.weight_kg} kg` : null} />
                        <DetailRow label="Microxip" value={animal.microchip_number} />
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Descripció</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">
                                {animal.description || 'Sense descripció disponible'}
                            </dd>
                        </div>
                        <DetailRow label="Condicions mediques" value={animal.medical_conditions} />
                    </dl>
                </div>

                {/* Barres matching */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <MatchingBars animal={animal} />
                </div>
            </div>
        </div>
    );
}
