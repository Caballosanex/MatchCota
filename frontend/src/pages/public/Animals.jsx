// Hook per guardar dades i Hook per fer coses a l'inici
import { useState, useEffect } from 'react';
// Link per navegar a la pàgina de detall sense recarregar
import { Link } from 'react-router-dom';
// Components UI reutilitzables creats per nosaltres
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
// Eina per parlar amb el backend
import { useApi } from '../../hooks/useApi';

/**
 * COMPONENT PÀGINA: Animals (Llistat d'adopcions)
 * ----------------------------------------------------------------------
 * Propòsit: Mostrar tots els animals disponibles en adopció per la protectora actual.
 * És una pàgina pública on els adoptants busquen quin animal els agrada.
 */
export default function Animals() {
    // 1. ESTATA LOCAL
    // Comencem amb una llista d'animals buida []
    const [animals, setAnimals] = useState([]);
    // Indiquem si estem esperant que el servidor respongui
    const [loading, setLoading] = useState(true);
    // Guardem possibles errors (ex: "No hi ha internet") per mostrar-los bonic
    const [error, setError] = useState(null);

    // Eina pròpia (del hook useApi) per fer trucades i enviar el token si fes falta
    const api = useApi();

    /**
     * EFECTE DE CÀRREGA INICIAL
     * Només obrir aquesta pantailla, va a buscar els animals a la base de dades.
     */
    useEffect(() => {
        // Funció asíncrona per descarregar les dades tranquil·lament sense bloquejar la pantalla
        const fetchAnimals = async () => {
            try {
                // Demanem a la URL '/animals' què hi ha.
                const data = await api.get('/animals');

                // GESTIÓ FORMATS DE RESPOSTA
                // De vegades les APIs tornen una Llista directament: [{}, {}, {}]
                if (Array.isArray(data)) {
                    setAnimals(data);
                    // De vegades ho tornen empaquetat dins d'un objecte: { items: [{}, {}] }
                } else if (data.items) {
                    setAnimals(data.items);
                    // I si no sabem què han tornat, netegem per si de cas.
                } else {
                    console.error("Format de resposta de l'API inesperat:", data);
                    setAnimals([]);
                }
            } catch (err) {
                // Si la petició fracassa, mostrem text vermell en lloc d'animals falsos.
                setError("No s'han pogut carregar els animals.");
                console.error(err);
            } finally {
                // Tant si ha anat BE com si ha FALLAT, ja no estem "carregant". Posem Loading a fals.
                setLoading(false);
            }
        };

        // L'executem!
        fetchAnimals();
    }, []); // Array buit vol dir que només s'executarà un cop

    // 2. RENDERITZAT CONDICIONAL (Dissenys d'espera)
    // Si encara està "pensant" (carregant dades)
    if (loading) return <div className="text-center py-10">Carregant animals...</div>;
    // Si la connexió va fallar.
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

    // 3. RENDERITZAT FINAL (Exitàs, ja tenim les dades!)
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>

            {/* Si la llista està buida (0 elements), diem que no n'hi ha */}
            {animals.length === 0 ? (
                <p>No hi ha animals disponibles en aquest moment.</p>
            ) : (
                /* CSS GRID: Llista estilitzada dependent del dispositiu
                   Mòbil -> 1 col, Tablet petita -> 2 col ('sm'), Ordinador -> 3 col ('lg') 
                */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* FEM UN BUCLE SOBRE L'ARRAY D'ANIMALS
                        El `.map(...)` iterarà la nostra llista `animals` de la línia 19,
                        i per cada gat o gos, fabricarà tot aquest tros visual de baix:
                    */}
                    {animals.map((animal) => (
                        // Sempre hem de posar `key={id}` perquè React pugui distingir les targetes.
                        // Hem afegit 'noPadding' al component Card per posar la foto enganxada fins a les vores.
                        <Card key={animal.id} noPadding className="hover:shadow-lg transition-shadow duration-300">

                            {/* FOTOGRAFIA DE L'ANIMAL */}
                            <img
                                className="h-48 w-full object-cover"
                                // `animal.photo_urls?.[0]` verifica que l'animal tingui un array de fotos
                                // i n'agafa només la primera. Si no en té... posa una foto grisa d'exemple!
                                src={animal.photo_urls?.[0] || 'https://via.placeholder.com/400x300?text=Sense+foto'}
                                alt={animal.name}
                            />

                            {/* CAIXA DE TEXT a sota de la foto */}
                            <div className="p-4">
                                <h3 className="text-lg font-medium text-gray-900">{animal.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {/* Ex: 'Gos • Labrador' o només 'Gos' si no hi ha raça. */}
                                    {animal.species}{animal.breed ? ` • ${animal.breed}` : ''}
                                </p>

                                <div className="mt-4">
                                    {/* Crea un enllaç al detall individual: '/animals/GosId392' */}
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
            )}
        </div>
    );
}
