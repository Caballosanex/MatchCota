import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';

export default function Dashboard() {
    const { user } = useAuth();
    const api = useApi();
    const [animalCount, setAnimalCount] = useState('-');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const animals = await api.get('/animals');
                if (Array.isArray(animals)) {
                    setAnimalCount(animals.length);
                }
            } catch {
                setAnimalCount('-');
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Panell de Control</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Animals</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{animalCount}</p>
                    <p className="text-sm text-gray-500 mt-1">En adopció</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Leads</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">-</p>
                    <p className="text-sm text-gray-500 mt-1">Pendent d'implementar</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Usuari</h3>
                    <p className="text-lg mt-2">{user?.name || user?.email}</p>
                    <p className="text-sm text-gray-500">{user?.username}</p>
                </Card>
            </div>
        </div>
    );
}
