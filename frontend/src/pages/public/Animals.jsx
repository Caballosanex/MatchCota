// Hook per guardar dades i Hook per fer coses a l'inici
import { useState, useEffect } from 'react';
// Link per navegar a la pàgina de detall sense recarregar
import { Link } from 'react-router-dom';
// Components UI reutilitzables creats per nosaltres
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SkeletonCard from '../../components/ui/SkeletonCard'; // IMPORTEM EL NOU COMPONENT SKELETON
// Eina per parlar amb el backend
import { useApi } from '../../hooks/useApi';

/**
 * COMPONENT PÀGINA: Animals (Llistat d'adopcions amb Paginació)
 * ----------------------------------------------------------------------
 * Propòsit: Mostrar tots els animals disponibles en adopció.
 * S'ha afegit un sistema de paginació manual (trams de 6 en 6 animals)
 * per evitar recarregar innecessàriament el navegador amb 500 imatges.
 * Durant la càrrega inicial s'ensenyen figures "fantasmes" (Skeletons) en comptes de text.
 */
export default function Animals() {
    // 1. ESTATS LOCALS
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ESTATS NOUS DE PAGINACIÓ
    // currentPage: Sabrà en quina pàgina estem actualment (per defecte la primera, la 1)
    const [currentPage, setCurrentPage] = useState(1);
    // itemsPerPage: Quants gossos volem ensenyar com a màxim per pàgina?
    const itemsPerPage = 6;

    const api = useApi();

    // 2. EFECTE DE CÀRREGA INICIAL
    useEffect(() => {
        const fetchAnimals = async () => {
            try {
                // FEM SERVIR PROMISE.ALL PER ESPERAR MÍNIM 600ms
                // Així assegurem que l'usuari vegi els "Skeletons" i evitem un parpelleig massa ràpid
                const [data] = await Promise.all([
                    api.get('/animals'),
                    new Promise(resolve => setTimeout(resolve, 600))
                ]);

                if (Array.isArray(data)) {
                    setAnimals(data);
                } else if (data.items) {
                    setAnimals(data.items);
                } else {
                    console.error("Format de resposta inútil:", data);
                    setAnimals([]);
                }
            } catch (err) {
                setError("No s'han pogut carregar els animals en aquest moment.");
                console.error(err);
            } finally {
                // IMPORTANT: Apaguem el Loading per deixar pas al disseny real.
                setLoading(false);
            }
        };

        fetchAnimals();
    }, []);

    // 3. MATEMÀTIQUES DE LA PAGINACIÓ CLIENT
    // Quin índex és el darrer animal d'aquesta pàgina? (ex. Pàgina 1 * 6 = 6)
    const indexOfLastAnimal = currentPage * itemsPerPage;
    // Quin és el primer? (ex. 6 - 6 = 0) L'array comença a 0!
    const indexOfFirstAnimal = indexOfLastAnimal - itemsPerPage;
    // Ara tallem el super array d'animals original per aquedar-nos només amb la part interessant ("slice")
    const currentAnimals = animals.slice(indexOfFirstAnimal, indexOfLastAnimal);

    // Calculem les pàgines totals matemàticament arrodonint cap amunt (Math.ceil)
    const totalPages = Math.ceil(animals.length / itemsPerPage);

    const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    // 4. RENDERITZAT CONDICIONAL: ESTAT ESPERA AMB SKELETONS
    // Això passarà DURANT uns segons, quan loading sigui True.
    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Generem 6 targetes fanstasmes del no res només per dibuixar la xarxa gris! */}
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={`skeleton-${index}`} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

    // 5. RENDERITZAT FINAL AMB DADES REALS I PAGINACIÓ
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>

            {animals.length === 0 ? (
                <p>No hi ha animals disponibles en aquest moment.</p>
            ) : (
                <>
                    {/* BUCLE: RECORREM LA NOVA SUBLISTA TALLADA (currentAnimals) MIDA MÀXIMA: 6 */}
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
                                        {animal.species}{animal.breed ? ` • ${animal.breed}` : ''}
                                    </p>
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

                    {/* BLOC DE PAGINACIÓ INFERIOR DE BOTONERIA */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex justify-center items-center gap-6">
                            {/* Botó Anterior: Amagat o apagat si estem a la 1ª pàgina */}
                            <Button
                                variant="outline"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </Button>

                            {/* Text per orientar l'usuari */}
                            <span className="text-gray-500 font-bold">
                                Pàgina {currentPage} de {totalPages}
                            </span>

                            {/* Botó Següent: Apagat si hem tocat sostre limit */}
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
