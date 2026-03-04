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
            <div className="text-center py-10 text-gray-500">
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
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>

            <AnimalFilters filters={filters} onFilterChange={handleFilterChange} />

            {animals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hi ha animals disponibles amb aquests filtres.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentAnimals.map((animal) => (
                            <Card key={animal.id} noPadding className="hover:shadow-lg transition-shadow duration-300">
                                <img
                                    className="h-48 w-full object-cover"
                                    src={animal.photo_urls?.[0] || 'https://via.placeholder.com/400x300?text=Sense+foto'}
                                    alt={animal.name}
                                />
                                <div className="p-4">
                                    <h3 className="text-lg font-medium text-gray-900">{animal.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {animal.species === 'dog' ? 'Gos' : animal.species === 'cat' ? 'Gat' : animal.species}
                                        {animal.breed ? ` - ${animal.breed}` : ''}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        {animal.sex && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {animal.sex === 'male' ? 'Mascle' : 'Femella'}
                                            </span>
                                        )}
                                        {animal.size && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                {animal.size === 'small' ? 'Petit' : animal.size === 'medium' ? 'Mitja' : 'Gran'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Link to={`/animals/${animal.id}`}>
                                            <Button variant="outline" size="sm" className="w-full">
                                                Veure detalls
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* BLOC DE PAGINACIÓ */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex justify-center items-center gap-6">
                            <Button
                                variant="outline"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </Button>
                            <span className="text-gray-500 font-bold">
                                Pàgina {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                            >
                                Següent
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
