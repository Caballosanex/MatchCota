import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import MatchingCharacteristics from './MatchingCharacteristics';
import ImageUpload from './ImageUpload';

const INITIAL_STATE = {
    name: '', species: 'dog', custom_species: '', breed: '', sex: '',
    birth_date: '', size: '', weight_kg: '',
    microchip_number: '', description: '', medical_conditions: '',
    is_ppp: false,
    energy_level: '', sociability: '', attention_needs: '',
    good_with_children: '', good_with_dogs: '', good_with_cats: '',
    experience_required: '',
    photo_urls: [],
};

function prepareInitialData(data) {
    if (!data) return { ...INITIAL_STATE, custom_species: '' };
    return {
        ...INITIAL_STATE,
        ...data,
        custom_species: '',
        birth_date: data.birth_date || '',
        weight_kg: data.weight_kg != null ? String(data.weight_kg) : '',
        energy_level: data.energy_level != null ? Number(data.energy_level) : '',
        sociability: data.sociability != null ? Number(data.sociability) : '',
        attention_needs: data.attention_needs != null ? Number(data.attention_needs) : '',
        good_with_children: data.good_with_children != null ? Number(data.good_with_children) : '',
        good_with_dogs: data.good_with_dogs != null ? Number(data.good_with_dogs) : '',
        good_with_cats: data.good_with_cats != null ? Number(data.good_with_cats) : '',
        experience_required: data.experience_required != null ? Number(data.experience_required) : '',
        photo_urls: data.photo_urls || [],
        is_ppp: data.is_ppp || false,
    };
}

export default function AnimalForm({ initialData = null, onSubmit, isLoading = false }) {
    const [formData, setFormData] = useState(() => prepareInitialData(initialData));
    const [errors, setErrors] = useState({});

    // Per carregar espècies guardades prèviament
    const [dbSpecies, setDbSpecies] = useState([]);
    const api = useApi();

    useEffect(() => {
        api.get('/animals').then(data => {
             const animalsList = Array.isArray(data) ? data : (data.items || []);
             const unique = [...new Set(animalsList.map(a => a.species).filter(Boolean))];
             setDbSpecies(unique.filter(s => s !== 'dog' && s !== 'cat' && s !== 'other'));
        }).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleMatchingChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotosChange = (urls) => {
        setFormData(prev => ({ ...prev, photo_urls: urls }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'El nom és obligatori';
        if (!formData.species) newErrors.species = "L'espècie és obligatòria";
        if (formData.species === 'other' && !formData.custom_species?.trim()) {
            newErrors.custom_species = "Especifica quina espècie és";
        }
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const toNum = (v) => (v !== '' && v != null ? parseFloat(v) : null);
        const toStr = (v) => (v || null);

        const body = {
            name: formData.name,
            species: formData.species === 'other' ? formData.custom_species.trim() : formData.species,
            breed: toStr(formData.breed),
            sex: toStr(formData.sex),
            birth_date: toStr(formData.birth_date),
            size: toStr(formData.size),
            weight_kg: toNum(formData.weight_kg),
            microchip_number: toStr(formData.microchip_number),
            description: toStr(formData.description),
            medical_conditions: toStr(formData.medical_conditions),
            is_ppp: formData.is_ppp,
            energy_level: toNum(formData.energy_level),
            sociability: toNum(formData.sociability),
            attention_needs: toNum(formData.attention_needs),
            good_with_children: toNum(formData.good_with_children),
            good_with_dogs: toNum(formData.good_with_dogs),
            good_with_cats: toNum(formData.good_with_cats),
            experience_required: toNum(formData.experience_required),
            photo_urls: formData.photo_urls.length > 0 ? formData.photo_urls : null,
        };
        onSubmit(body);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Columna Esquerra: Fotos */}
                <div className="lg:col-span-1 space-y-6 sticky top-6">
                    <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <ImageUpload photos={formData.photo_urls} onChange={handlePhotosChange} />
                    </section>
                </div>

                {/* Columna Dreta: Dades, Descripció i Matching */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Secció 1: Info bàsica */}
                    <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Informació Bàsica</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <Input label="Nom *" name="name" value={formData.name} onChange={handleChange} error={errors.name} />
                            <Select label="Espècie *" name="species" value={formData.species} onChange={handleChange} error={errors.species}>
                                <option value="dog">Gos</option>
                                <option value="cat">Gat</option>
                                {dbSpecies.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                                {formData.species && !['dog', 'cat', 'other'].includes(formData.species) && !dbSpecies.includes(formData.species) && (
                                    <option value={formData.species}>{formData.species}</option>
                                )}
                                <option value="other">Altre (Escriure manualment...)</option>
                            </Select>

                            {formData.species === 'other' && (
                                <Input 
                                    label="Quina espècie és? *" 
                                    name="custom_species" 
                                    value={formData.custom_species} 
                                    onChange={handleChange} 
                                    placeholder="Ex: Conill, Fura, Ocell..."
                                    error={errors.custom_species}
                                />
                            )}

                            <Input label="Raça" name="breed" value={formData.breed} onChange={handleChange} />
                            <Select label="Sexe" name="sex" value={formData.sex} onChange={handleChange}>
                                <option value="">Selecciona...</option>
                                <option value="male">Mascle</option>
                                <option value="female">Femella</option>
                            </Select>
                            <Input label="Data de naixement" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
                            <Select label="Mida" name="size" value={formData.size} onChange={handleChange}>
                                <option value="">Selecciona...</option>
                                <option value="small">Petit</option>
                                <option value="medium">Mitjà</option>
                                <option value="large">Gran</option>
                            </Select>
                            <Input label="Pes (kg)" name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange} />
                            <Input label="Número microxip" name="microchip_number" value={formData.microchip_number} onChange={handleChange} />
                        </div>
                        
                        <div className="mt-6 flex items-center bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                name="is_ppp"
                                id="is_ppp"
                                checked={formData.is_ppp}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="is_ppp" className="ml-3 text-sm font-bold text-gray-700 cursor-pointer">
                                És PPP (Raça potencialment perillosa)
                            </label>
                        </div>
                    </section>

                    {/* Secció 2: Descripció */}
                    <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Descripció i Salut</h3>
                        <div className="space-y-5">
                            <Textarea
                                label="Descripció i personalitat"
                                name="description"
                                rows={4}
                                value={formData.description || ''}
                                onChange={handleChange}
                                placeholder="Explica com és la seva personalitat..."
                            />
                            <Textarea
                                label="Condicions mèdiques"
                                name="medical_conditions"
                                rows={2}
                                value={formData.medical_conditions || ''}
                                onChange={handleChange}
                                placeholder="Alguna condició mèdica a tenir en compte?"
                            />
                        </div>
                    </section>

                    {/* Secció 3: Característiques de matching Desplegable */}
                    <details className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-bold text-gray-900 hover:bg-gray-50/80 transition-colors select-none">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                </div>
                                <span className="text-lg">Trets de Personalitat (Matching)</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 group-open:rotate-180 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </summary>
                        <div className="px-6 pb-6 pt-4 border-t border-gray-100">
                            <MatchingCharacteristics values={formData} onChange={handleMatchingChange} />
                        </div>
                    </details>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 pb-12">
                <Button type="submit" isLoading={isLoading} className="px-8 py-3.5 text-lg rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md hover:shadow-lg transition-all border-none flex items-center gap-2 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {initialData ? 'Guardar canvis' : 'Crear animal'}
                </Button>
            </div>
        </form>
    );
}
