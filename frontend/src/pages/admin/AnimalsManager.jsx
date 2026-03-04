import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function AnimalsManager() {
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const api = useApi();
    const navigate = useNavigate();

    const fetchAnimals = async () => {
        try {
            setLoading(true);
            const data = await api.get('/animals');
            setAnimals(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnimals(); }, []);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Segur que vols eliminar "${name}"?`)) return;
        try {
            await api.delete(`/admin/animals/${id}`);
            setAnimals(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="text-center py-10">Carregant...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Gestio d'Animals</h1>
                <Link to="/admin/animals/new">
                    <Button>+ Nou Animal</Button>
                </Link>
            </div>

            {error && (
                <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md text-sm">{error}</div>
            )}

            {animals.length === 0 ? (
                <Card>
                    <p className="text-gray-500 text-center">No hi ha animals registrats.</p>
                </Card>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especie</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raca</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mida</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {animals.map((animal) => (
                                <tr key={animal.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <img
                                            src={animal.photo_urls?.[0] || 'https://via.placeholder.com/40?text=?'}
                                            alt={animal.name}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{animal.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{animal.species}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{animal.breed || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{animal.sex || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{animal.size || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/admin/animals/${animal.id}`)}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDelete(animal.id, animal.name)}
                                        >
                                            Eliminar
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
