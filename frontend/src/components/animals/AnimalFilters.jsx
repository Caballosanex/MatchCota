export default function AnimalFilters({ filters, onFilterChange }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onFilterChange({ ...filters, [name]: value });
    };

    return (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Especie</label>
                <select
                    name="species"
                    value={filters.species || ''}
                    onChange={handleChange}
                    className="rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Totes</option>
                    <option value="dog">Gos</option>
                    <option value="cat">Gat</option>
                    <option value="other">Altre</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mida</label>
                <select
                    name="size"
                    value={filters.size || ''}
                    onChange={handleChange}
                    className="rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Totes</option>
                    <option value="small">Petit</option>
                    <option value="medium">Mitja</option>
                    <option value="large">Gran</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sexe</label>
                <select
                    name="sex"
                    value={filters.sex || ''}
                    onChange={handleChange}
                    className="rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Tots</option>
                    <option value="male">Mascle</option>
                    <option value="female">Femella</option>
                </select>
            </div>
        </div>
    );
}
