import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import AnimalForm from '../../components/animals/AnimalForm';
import Button from '../../components/ui/Button';

export default function AnimalEdit() {
    const { id } = useParams();
    const api = useApi();
    const navigate = useNavigate();
    const [animal, setAnimal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnimal = async () => {
            try {
                const data = await api.get(`/animals/${id}`);
                setAnimal(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchAnimal();
    }, [id]);

    const handleSubmit = async (body) => {
        setSaving(true);
        setError(null);
        try {
            await api.put(`/admin/animals/${id}`, body);
            navigate('/admin/animals');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-10">Carregant...</div>;
    if (error && !animal) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Editar: {animal?.name}</h1>
                <Button variant="secondary" onClick={() => navigate('/admin/animals')}>
                    Tornar
                </Button>
            </div>
            {error && (
                <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md text-sm">{error}</div>
            )}
            <div className="bg-white shadow rounded-lg p-6">
                <AnimalForm initialData={animal} onSubmit={handleSubmit} isLoading={saving} />
            </div>
        </div>
    );
}
