import RangeSlider from '../ui/RangeSlider';

const CHARACTERISTICS = [
    { name: 'energy_level', label: "Nivell d'energia", description: '0 = Molt tranquil, 10 = Molt actiu' },
    { name: 'sociability', label: 'Sociabilitat', description: '0 = Reservat, 10 = Molt sociable' },
    { name: 'attention_needs', label: "Necessitat d'atencio", description: '0 = Independent, 10 = Molt dependent' },
    { name: 'good_with_children', label: 'Bo amb nens', description: '0 = No recomanat, 10 = Excellent' },
    { name: 'good_with_dogs', label: 'Bo amb gossos', description: '0 = No recomanat, 10 = Excellent' },
    { name: 'good_with_cats', label: 'Bo amb gats', description: '0 = No recomanat, 10 = Excellent' },
    { name: 'experience_required', label: 'Experiencia necessaria', description: '0 = Cap, 10 = Molta experiencia' },
];

export default function MatchingCharacteristics({ values, onChange }) {
    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Caracteristiques de matching</h3>
            <p className="text-sm text-gray-500 mb-4">
                Aquests valors es fan servir per l'algoritme de compatibilitat amb adoptants.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CHARACTERISTICS.map((char) => (
                    <RangeSlider
                        key={char.name}
                        name={char.name}
                        label={char.label}
                        description={char.description}
                        value={values[char.name]}
                        onChange={onChange}
                    />
                ))}
            </div>
        </section>
    );
}
