import { useState } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import MatchingCharacteristics from './MatchingCharacteristics';
import ImageUpload from './ImageUpload';

const INITIAL_STATE = {
    name: '', species: 'dog', breed: '', sex: '',
    birth_date: '', size: '', weight_kg: '',
    microchip_number: '', description: '', medical_conditions: '',
    is_ppp: false,
    energy_level: '', sociability: '', attention_needs: '',
    good_with_children: '', good_with_dogs: '', good_with_cats: '',
    experience_required: '',
    photo_urls: [],
};

function prepareInitialData(data) {
    if (!data) return { ...INITIAL_STATE };
    return {
        ...INITIAL_STATE,
        ...data,
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
        if (!formData.name.trim()) newErrors.name = 'El nom es obligatori';
        if (!formData.species) newErrors.species = "L'especie es obligatoria";
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
            species: formData.species,
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
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Seccio 1: Info basica */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informacio basica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nom *" name="name" value={formData.name} onChange={handleChange} error={errors.name} />
                    <Select label="Especie *" name="species" value={formData.species} onChange={handleChange} error={errors.species}>
                        <option value="dog">Gos</option>
                        <option value="cat">Gat</option>
                        <option value="other">Altre</option>
                    </Select>
                    <Input label="Raca" name="breed" value={formData.breed} onChange={handleChange} />
                    <Select label="Sexe" name="sex" value={formData.sex} onChange={handleChange}>
                        <option value="">Selecciona...</option>
                        <option value="male">Mascle</option>
                        <option value="female">Femella</option>
                    </Select>
                    <Input label="Data de naixement" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} />
                    <Select label="Mida" name="size" value={formData.size} onChange={handleChange}>
                        <option value="">Selecciona...</option>
                        <option value="small">Petit</option>
                        <option value="medium">Mitja</option>
                        <option value="large">Gran</option>
                    </Select>
                    <Input label="Pes (kg)" name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange} />
                    <Input label="Numero microxip" name="microchip_number" value={formData.microchip_number} onChange={handleChange} />
                </div>
                <div className="mt-4 flex items-center">
                    <input
                        type="checkbox"
                        name="is_ppp"
                        id="is_ppp"
                        checked={formData.is_ppp}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_ppp" className="ml-2 text-sm text-gray-700">
                        Es PPP (Raca potencialment perillosa)
                    </label>
                </div>
            </section>

            {/* Seccio 2: Descripcio */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Descripcio</h3>
                <Textarea
                    label="Descripcio i personalitat"
                    name="description"
                    rows={4}
                    value={formData.description || ''}
                    onChange={handleChange}
                    placeholder="Explica com es la seva personalitat..."
                />
                <div className="mt-4">
                    <Textarea
                        label="Condicions mediques"
                        name="medical_conditions"
                        rows={2}
                        value={formData.medical_conditions || ''}
                        onChange={handleChange}
                        placeholder="Alguna condicio medica a tenir en compte?"
                    />
                </div>
            </section>

            {/* Seccio 3: Caracteristiques de matching */}
            <MatchingCharacteristics values={formData} onChange={handleMatchingChange} />

            {/* Seccio 4: Fotos */}
            <ImageUpload photos={formData.photo_urls} onChange={handlePhotosChange} />

            {/* Submit */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="submit" isLoading={isLoading}>
                    {initialData ? 'Guardar canvis' : 'Crear animal'}
                </Button>
            </div>
        </form>
    );
}
