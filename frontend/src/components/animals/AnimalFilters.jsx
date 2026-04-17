export default function AnimalFilters({ filters, onFilterChange }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        onFilterChange({ ...filters, [name]: value });
    };

    const filterSelectClasses =
        'w-full rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 text-sm text-slate-700 shadow-sm shadow-slate-200/60 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25';

    return (
        <section className="sticky top-24 z-20 mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/70 backdrop-blur-sm sm:p-5 lg:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-dark/70">
                        Descobreix la teva futura companya
                    </p>
                    <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                        Filtra per trobar el millor match
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Especie</label>
                    <select
                        name="species"
                        value={filters.species || ''}
                        onChange={handleChange}
                        className={filterSelectClasses}
                    >
                        <option value="">Totes</option>
                        <option value="dog">Gos</option>
                        <option value="cat">Gat</option>
                        <option value="other">Altre</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Mida</label>
                    <select
                        name="size"
                        value={filters.size || ''}
                        onChange={handleChange}
                        className={filterSelectClasses}
                    >
                        <option value="">Totes</option>
                        <option value="small">Petit</option>
                        <option value="medium">Mitja</option>
                        <option value="large">Gran</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Sexe</label>
                    <select
                        name="sex"
                        value={filters.sex || ''}
                        onChange={handleChange}
                        className={filterSelectClasses}
                    >
                        <option value="">Tots</option>
                        <option value="male">Mascle</option>
                        <option value="female">Femella</option>
                    </select>
                </div>
            </div>
        </section>
    );
}
