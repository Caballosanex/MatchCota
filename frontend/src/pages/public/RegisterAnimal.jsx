import { useState } from 'react';
import { createAnimal } from "../../api/animals";

export default function RegisterAnimal() {
    const [formData, setFormData] = useState({
        name: '',
        species: 'dog', // dog, cat, etc.
        breed: '',
        age: '',
        gender: 'male',
        weight: '',
        description: '',
        health_status: '',
    });
    const [image, setImage] = useState(null);
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

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Usamos FormData porque hay una imagen/archivo
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (image) data.append('image', image);

        try {
            await createAnimal(data);
            setSuccess(true);
            setFormData({
                name: '', species: 'dog', breed: '', age: '',
                gender: 'male', weight: '', description: '', health_status: ''
            });
            setImage(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Afegir nou animal</h2>
                    <p className="text-gray-600">Introdueix les dades per trobar la família ideal</p>
                </div>

                <form className="bg-white shadow-sm rounded-xl p-6 space-y-6 border border-gray-100" onSubmit={handleSubmit}>

                    {/* Foto de l'animal */}
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-6 hover:border-indigo-400 transition-colors">
                        <input type="file" onChange={handleImageChange} className="hidden" id="pet-image" accept="image/*" />
                        <label htmlFor="pet-image" className="cursor-pointer text-center">
                            <span className="text-indigo-600 font-medium">Puja una foto</span> o arrossega-la
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG fins a 10MB</p>
                        </label>
                        {image && <p className="mt-2 text-sm text-green-600">✓ {image.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nom */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom de l'animal</label>
                            <input name="name" type="text" required value={formData.name} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        {/* Espècie */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Espècie</label>
                            <select name="species" value={formData.species} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="dog">Gos</option>
                                <option value="cat">Gat</option>
                                <option value="other">Altre</option>
                            </select>
                        </div>

                        {/* Edat */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Edat</label>
                            <input name="age" type="text" placeholder="ex: 2 anys" value={formData.age} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>

                        {/* Pes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pes (kg)</label>
                            <input name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    {/* Descripció */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripció i personalitat</label>
                        <textarea name="description" rows="4" value={formData.description} onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Explica com és la seva personalitat..." />
                    </div>

                    {/* Feedback visual */}
                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}
                    {success && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">Animal registrat amb èxit!</div>}

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