const BARS = [
    { key: 'energy_level', label: 'Energia', color: 'bg-yellow-500' },
    { key: 'sociability', label: 'Sociabilitat', color: 'bg-green-500' },
    { key: 'attention_needs', label: "Necessitat d'atencio", color: 'bg-purple-500' },
    { key: 'good_with_children', label: 'Bo amb nens', color: 'bg-blue-500' },
    { key: 'good_with_dogs', label: 'Bo amb gossos', color: 'bg-orange-500' },
    { key: 'good_with_cats', label: 'Bo amb gats', color: 'bg-pink-500' },
    { key: 'experience_required', label: 'Experiencia req.', color: 'bg-red-500' },
];

export default function MatchingBars({ animal }) {
    const hasAnyValue = BARS.some((b) => animal[b.key] != null);
    if (!hasAnyValue) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">Caracteristiques</h3>
            {BARS.map((bar) => {
                const value = animal[bar.key];
                if (value == null) return null;
                const percentage = (parseFloat(value) / 10) * 100;
                return (
                    <div key={bar.key}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{bar.label}</span>
                            <span className="font-medium">{value}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`${bar.color} h-2 rounded-full`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
