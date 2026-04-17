// Hook per guardar dades i Hook per fer coses a l'inici
import { useState, useEffect } from 'react';
// Link per navegar a la pàgina de detall sense recarregar
import { Link, useSearchParams } from 'react-router-dom';
// Components UI reutilitzables creats per nosaltres
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SkeletonCard from '../../components/ui/SkeletonCard';
import AnimalFilters from '../../components/animals/AnimalFilters';
// Eina per parlar amb el backend
import { useApi } from '../../hooks/useApi';
import { useTenant } from '../../hooks/useTenant';

const ITEMS_PER_PAGE = 6;

/**
 * COMPONENT PÀGINA: Animals (Llistat d'adopcions amb Filtres i Paginació)
 * ----------------------------------------------------------------------
 * Propòsit: Mostrar tots els animals disponibles en adopció.
 * S'ha afegit un sistema de paginació manual (trams de 6 en 6 animals)
 * per evitar recarregar innecessàriament el navegador amb 500 imatges.
 * Durant la càrrega inicial s'ensenyen figures "fantasmes" (Skeletons) en comptes de text.
 * Els filtres s'emmagatzemen a la URL per permetre URLs compartibles.
 */
export default function Animals() {
    // 1. ESTATS LOCALS
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ESTATS DE PAGINACIÓ
    const [currentPage, setCurrentPage] = useState(1);

    // Filtres emmagatzemats a la URL (compartibles)
    const [searchParams, setSearchParams] = useSearchParams();

    const api = useApi();
    const { tenant } = useTenant();

    const filters = {
        species: searchParams.get('species') || '',
        size: searchParams.get('size') || '',
        sex: searchParams.get('sex') || '',
    };

    const handleFilterChange = (newFilters) => {
        const params = new URLSearchParams();
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        setSearchParams(params);
        setCurrentPage(1); // Tornem a la primera pàgina en canviar filtres
    };

    // 2. EFECTE DE CÀRREGA INICIAL
    useEffect(() => {
        if (!tenant) {
            setLoading(false);
            return;
        }

        const fetchAnimals = async () => {
            try {
                setLoading(true);
                const queryStr = searchParams.toString();
                const endpoint = `/animals${queryStr ? `?${queryStr}` : ''}`;

                // FEM SERVIR PROMISE.ALL PER ESPERAR MÍNIM 600ms
                // Així assegurem que l'usuari vegi els "Skeletons" i evitem un parpelleig massa ràpid
                const [data] = await Promise.all([
                    api.get(endpoint),
                    new Promise(resolve => setTimeout(resolve, 600))
                ]);

                setAnimals(Array.isArray(data) ? data : (data.items || []));
            } catch (err) {
                setError("No s'han pogut carregar els animals en aquest moment.");
                console.error(err);
            } finally {
                // IMPORTANT: Apaguem el Loading per deixar pas al disseny real.
                setLoading(false);
            }
        };

        fetchAnimals();
    }, [searchParams, tenant]);

    if (!tenant) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-10 text-center text-slate-500 shadow-sm shadow-slate-200/60">
                Selecciona una protectora per veure els animals.
            </div>
        );
    }

    // 3. MATEMÀTIQUES DE LA PAGINACIÓ CLIENT
    const indexOfLastAnimal = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstAnimal = indexOfLastAnimal - ITEMS_PER_PAGE;
    const currentAnimals = animals.slice(indexOfFirstAnimal, indexOfLastAnimal);
    const totalPages = Math.ceil(animals.length / ITEMS_PER_PAGE);

    const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    // 4. RENDERITZAT CONDICIONAL: ESTAT ESPERA AMB SKELETONS
    if (loading) {
        return (
            <div className="space-y-8">
                <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-light/20 to-indigo-100/40 p-7 shadow-sm shadow-slate-200/60 sm:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark/70">Editorial Collection</p>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                        Els nostres animals en adopció
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
                        Descobreix històries úniques i troba l&apos;animal que millor encaixa amb tu.
                    </p>
                </section>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={`skeleton-${index}`} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

    // 5. RENDERITZAT FINAL AMB DADES REALS, FILTRES I PAGINACIÓ
    return (
        <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-light/20 to-indigo-100/40 p-7 shadow-sm shadow-slate-200/60 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark/70">Editorial Collection</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                            Els nostres animals en adopció
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
                            Descobreix històries úniques i troba l&apos;animal que millor encaixa amb tu.
                        </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                        {animals.length} disponibles
                    </div>
                </div>
            </section>

            <AnimalFilters filters={filters} onFilterChange={handleFilterChange} />

            {animals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                    <p className="text-slate-500">No hi ha animals disponibles amb aquests filtres.</p>
                </div>
            ) : (
                <>
                    <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {currentAnimals.map((animal) => {
                            const speciesLabel = animal.species === 'dog' ? 'Gos' : animal.species === 'cat' ? 'Gat' : animal.species;
                            const sexLabel = animal.sex === 'male' ? 'Mascle' : 'Femella';
                            const sizeLabel = animal.size === 'small' ? 'Petit' : animal.size === 'medium' ? 'Mitja' : 'Gran';

                            return (
                                <Card key={animal.id} noPadding className="group overflow-hidden border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/70">
                                    <div className="relative overflow-hidden">
                                        <img
                                            className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                            src={animal.photo_urls?.[0] || 'https://via.placeholder.com/400x300?text=Sense+foto'}
                                            alt={animal.name}
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/0 to-transparent" />
                                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                                            {animal.sex && (
                                                <span className="inline-flex items-center rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                                    {sexLabel}
                                                </span>
                                            )}
                                            {animal.size && (
                                                <span className="inline-flex items-center rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                                    {sizeLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-5">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-primary-dark/70">{speciesLabel}</p>
                                            <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{animal.name}</h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {animal.breed || 'Raça no especificada'}
                                            </p>
                                        </div>

                                        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                                            {animal.description || 'Coneix la seva personalitat i descobreix si és el teu company ideal.'}
                                        </p>

                                        <Link to={`/animals/${animal.id}`}>
                                            <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary-dark hover:bg-primary/10">
                                                Veure detalls
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            );
                        })}
                    </section>

                    {totalPages > 1 && (
                        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm shadow-slate-200/60">
                                <Button
                                    variant="ghost"
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className="rounded-xl px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
                                >
                                    Anterior
                                </Button>

                                <span className="mx-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary-dark">
                                    {currentPage}
                                </span>

                                <span className="pr-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                                    de {totalPages}
                                </span>

                                <Button
                                    variant="ghost"
                                    onClick={nextPage}
                                    disabled={currentPage === totalPages}
                                    className="rounded-xl px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
                                >
                                    Següent
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
