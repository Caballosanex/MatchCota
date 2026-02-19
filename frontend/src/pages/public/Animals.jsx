import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useApi } from '../../hooks/useApi';

export default function Animals() {
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const api = useApi();

    useEffect(() => {
        const fetchAnimals = async () => {
            try {
                const data = await api.get('/animals');
                // Assuming API returns array or { items: [] }
                if (Array.isArray(data)) {
                    setAnimals(data);
                } else if (data.items) {
                    setAnimals(data.items);
                } else {
                    console.error("Unexpected API response format:", data);
                    setAnimals([]);
                }
            } catch (err) {
                setError("No s'han pogut carregar els animals.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnimals();
    }, []);

    if (loading) return <div className="text-center py-10">Carregant animals...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Els nostres animals en adopció</h1>

            {animals.length === 0 ? (
                <p>No hi ha animals disponibles en aquest moment.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {animals.map((animal) => (
                        <Card key={animal.id} noPadding className="hover:shadow-lg transition-shadow duration-300">
                            <img className="h-48 w-full object-cover" src={animal.image} alt={animal.name} />
                            <div className="p-4">
                                <h3 className="text-lg font-medium text-gray-900">{animal.name}</h3>
                                <p className="text-sm text-gray-500">{animal.breed} • {animal.age}</p>
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
            )}
        </div>
    );
}
