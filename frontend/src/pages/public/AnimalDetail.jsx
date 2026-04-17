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
    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-10 text-center text-slate-500 shadow-sm shadow-slate-200/60">
                Carregant detalls...
            </div>
        );
    }

    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!animal) return <div className="text-center py-10">Animal no trobat</div>;

    const speciesLabel = LABEL_MAP.species[animal.species] || animal.species;
    const sexLabel = LABEL_MAP.sex[animal.sex] || animal.sex;
    const sizeLabel = LABEL_MAP.size[animal.size] || animal.size;

    // 4. Disseny final: layout 2 columnes amb galeria, fitxa i barres
    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-light/20 to-indigo-100/40 shadow-sm shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-6 sm:px-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark/70">Ficha editorial</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{animal.name}</h1>
                        <p className="mt-2 text-sm text-slate-600 sm:text-base">
                            {speciesLabel}
                            {animal.breed ? ` · ${animal.breed}` : ''}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {animal.sex && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                    {sexLabel}
                                </span>
                            )}
                            {animal.size && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                    {sizeLabel}
                                </span>
                            )}
                            {animal.is_ppp && (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                                    PPP
                                </span>
                            )}
                        </div>
                    </div>
                    <Link to="/animals">
                        <Button variant="secondary" className="rounded-full px-5">Tornar</Button>
                    </Link>
                </div>

                <div className="px-4 pb-4 pt-4 sm:px-8 sm:pb-8">
                    <PhotoGallery photos={animal.photo_urls} />
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/60 lg:col-span-2">
                    <div className="border-b border-slate-200/80 px-6 py-4 sm:px-8">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">Informació</h2>
                        <p className="mt-1 text-sm text-slate-500">Dades essencials per conèixer millor aquest animal.</p>
                    </div>

                    <dl className="sm:divide-y sm:divide-slate-100">
                        <DetailRow label="Especie" value={speciesLabel} />
                        <DetailRow label="Raca" value={animal.breed} />
                        <DetailRow label="Sexe" value={sexLabel} />
                        <DetailRow label="Data Naixement" value={animal.birth_date} />
                        <DetailRow label="Mida" value={sizeLabel} />
                        <DetailRow label="Pes" value={animal.weight_kg ? `${animal.weight_kg} kg` : null} />
                        <DetailRow label="Microxip" value={animal.microchip_number} />
                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                            <dt className="text-sm font-medium text-gray-500">Descripció</dt>
                            <dd className="mt-1 whitespace-pre-line text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                                {animal.description || 'Sense descripció disponible'}
                            </dd>
                        </div>
                        <DetailRow label="Condicions mediques" value={animal.medical_conditions} />
                    </dl>
                </section>

                <aside className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-200/60">
                    <h3 className="mb-4 text-base font-bold tracking-tight text-slate-900">Compatibilitat</h3>
                    <MatchingBars animal={animal} />
                </aside>
            </div>
        </div>
    );
}
