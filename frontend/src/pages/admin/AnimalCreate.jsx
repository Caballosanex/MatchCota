import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import AnimalForm from '../../components/animals/AnimalForm';
import Button from '../../components/ui/Button';

export default function AnimalCreate() {
    const api = useApi();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (body) => {
        setSaving(true);
        setError(null);
        try {
            await api.post('/admin/animals', body);
            navigate('/admin/animals');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Afegir nou animal</h1>
                <Button variant="secondary" onClick={() => navigate('/admin/animals')}>
                    Tornar
                </Button>
            </div>
            {error && (
                <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md text-sm">{error}</div>
            )}
            <div className="bg-white shadow rounded-lg p-6">
                <AnimalForm onSubmit={handleSubmit} isLoading={saving} />
            </div>
        </div>
    );
}
