import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function RegisterAnimal() {
    const api = useApi();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        species: 'dog',
        breed: '',
        sex: 'male',
        size: '',
        weight_kg: '',
        description: '',
        medical_conditions: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            setError("Has d'iniciar sessió per registrar un animal.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const body = {
                name: formData.name,
                species: formData.species,
                breed: formData.breed || null,
                sex: formData.sex || null,
                size: formData.size || null,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                description: formData.description || null,
                medical_conditions: formData.medical_conditions || null,
            };

            await api.post('/admin/animals', body);
            setSuccess(true);
            setFormData({
                name: '', species: 'dog', breed: '', sex: 'male',
                size: '', weight_kg: '', description: '', medical_conditions: ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Accés restringit</h2>
                <p className="text-gray-600 mb-4">Has d'iniciar sessió per afegir animals.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Iniciar sessió
                </button>
            </div>
        );
    }

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Afegir nou animal</h2>
                    <p className="text-gray-600">Introdueix les dades per trobar la familia ideal</p>
                </div>

                <form className="bg-white shadow-sm rounded-xl p-6 space-y-6 border border-gray-100" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom de l'animal *</label>
                            <input name="name" type="text" required value={formData.name} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Especie *</label>
                            <select name="species" value={formData.species} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="dog">Gos</option>
                                <option value="cat">Gat</option>
                                <option value="other">Altre</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Raca</label>
                            <input name="breed" type="text" value={formData.breed} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sexe</label>
                            <select name="sex" value={formData.sex} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="male">Mascle</option>
                                <option value="female">Femella</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mida</label>
                            <select name="size" value={formData.size} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="">Selecciona...</option>
                                <option value="small">Petit</option>
                                <option value="medium">Mitja</option>
                                <option value="large">Gran</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pes (kg)</label>
                            <input name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripció i personalitat</label>
                        <textarea name="description" rows="4" value={formData.description} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Explica com es la seva personalitat..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Condicions mediques</label>
                        <textarea name="medical_conditions" rows="2" value={formData.medical_conditions} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Alguna condició medica a tenir en compte?" />
                    </div>

                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}
                    {success && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">Animal registrat correctament!</div>}

                    <div className="pt-4">
                        <button type="submit" disabled={loading}
                            className={`w-full py-3 px-4 rounded-md shadow-sm text-white font-semibold bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 ${loading ? 'opacity-50' : ''}`}>
                            {loading ? 'Guardant...' : 'Publicar animal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
