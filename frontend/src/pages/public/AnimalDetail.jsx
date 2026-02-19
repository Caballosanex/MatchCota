import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useApi } from '../../hooks/useApi';

export default function AnimalDetail() {
    const { id } = useParams();
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
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchAnimal();
        }
    }, [id]);

    if (loading) return <div className="text-center py-10">Carregant detalls...</div>;
    if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
    if (!animal) return <div className="text-center py-10">Animal no trobat</div>;

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Detall de l'animal
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        ID: {animal.id}
                    </p>
                </div>
                <Button onClick={() => window.history.back()} variant="secondary">
                    Tornar
                </Button>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Nom</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.name}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Raça</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.breed || animal.raca}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Edat/Data Naixement</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{animal.birth_date || animal.age || animal.data_naixement}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Descripció</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {animal.description || animal.descripcio || 'Sense descripció disponible'}
                        </dd>
                    </div>
                    {/* Add more fields as needed based on API response structure */}
                </dl>
            </div>
        </div>
    );
}
