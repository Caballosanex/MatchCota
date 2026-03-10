import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';

export default function AnimalsManager() {
    // 1. DADES DEL SERVIDOR
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 2. ESTATS DELS FILTRES I ORDENACIÓ
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSpecies, setFilterSpecies] = useState('');
    const [filterBreed, setFilterBreed] = useState('');
    const [filterSize, setFilterSize] = useState('');
    const [filterAge, setFilterAge] = useState(''); // 'pup', 'young', 'adult', 'senior'
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'name_asc', 'name_desc', 'age_asc', 'age_desc'

    const api = useApi();
    const navigate = useNavigate();

    const fetchAnimals = async () => {
        try {
            setLoading(true);
            const data = await api.get('/animals');
            setAnimals(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnimals(); }, []);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Segur que vols eliminar "${name}"?`)) return;
        try {
            await api.delete(`/admin/animals/${id}`);
            setAnimals(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    // -------------------------------------------------------------
    // FUNCIONS D'ACOMPANYAMENT PER FILTRAR I ORDENAR
    // -------------------------------------------------------------

    // A. Calculadora d'Edat: Ens diu quants anys té donada una data
    const calculateAgeInYears = (birthDateString) => {
        if (!birthDateString) return null;
        const birth = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--; // Encara no ha fet els anys aquest any
        }
        return age; // Retorna número (ex: 3)
    };

    // Obtenim quina paraula d'edat pertany (Cadell, Jove...) per mostrar o filtrar
    const getAgeCategory = (ageInYears) => {
        if (ageInYears === null) return 'Desconeguda';
        if (ageInYears < 1) return 'pup';     // Cadell
        if (ageInYears <= 3) return 'young';  // Jove (1 a 3)
        if (ageInYears <= 7) return 'adult';  // Adult (4 a 7)
        return 'senior';                      // Sènior (+7)
    };

    // Formateja l'edat en text "bonic" per la taula
    const formatAgeText = (birthDateString) => {
        const age = calculateAgeInYears(birthDateString);
        if (age === null) return 'Edat desconeguda';
        if (age === 0) return 'Menys d\'un any';
        return `${age} any${age > 1 ? 's' : ''}`;
    };

    // B. Preparar filtres desplegables (extreure valors únics existents)
    const uniqueSpecies = [...new Set(animals.map(a => a.species).filter(Boolean))].sort();
    const uniqueBreeds = [...new Set(animals.map(a => a.breed).filter(Boolean))].sort();

    // C. PROCESSAR LES DADES (El cor de la nova funcionalitat)
    const filteredAndSortedAnimals = animals
        .filter(a => {
            // 0. Cerca per Text (Nom)
            if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // 1. Filtre per Espècie (Gos, Gat...)
            if (filterSpecies && a.species !== filterSpecies) return false;
            // 2. Filtre per Raça
            if (filterBreed && a.breed !== filterBreed) return false;
            // 3. Filtre per Mida
            if (filterSize && a.size !== filterSize) return false;
            // 4. Filtre per Edat
            if (filterAge) {
                const ageCat = getAgeCategory(calculateAgeInYears(a.birth_date));
                if (filterAge !== ageCat) return false;
            }
            return true; // Si ha superat tots els filtres, es mostra.
        })
        .sort((a, b) => {
            // Un cop filtrats, toca ordenar la llista existent segons el desplegable
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name);

            if (sortBy === 'age_asc' || sortBy === 'age_desc') {
                const ageA = calculateAgeInYears(a.birth_date);
                const ageB = calculateAgeInYears(b.birth_date);

                // Si algun no té edat, l'enviem al final pèr no entorpir
                if (ageA === null) return 1;
                if (ageB === null) return -1;

                if (sortBy === 'age_asc') return ageA - ageB; // Del més jove al més vell
                return ageB - ageA; // Del més vell al més jove
            }

            // Per defecte ('newest'), podem assumir l'ordre del Backend (id o createdAt si en té)
            return 0;
        });

    if (loading) return <div className="text-center py-10">Carregant...</div>;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Cabecera superior amb títol i botó d'afegir */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-serif">Animals</h1>
                    <p className="text-gray-500 mt-1">Gestiona els perfils dels animals en adopció.</p>
                </div>
                <Button
                    onClick={() => navigate('/admin/animals/new')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 border-none text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nou Animal
                </Button>
            </div>

            {error && (
                <div className="mb-4 text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-sm font-medium">{error}</div>
            )}

            {/* SECCIÓ FILTRES I ORDENACIÓ */}
            {animals.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-4">

                    {/* Fila 1: Cerca principal i Ordenació */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Cerca per nom..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Ordenar:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm font-medium bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all cursor-pointer min-w-max"
                            >
                                <option value="newest">Més Recents</option>
                                <option value="name_asc">A - Z</option>
                                <option value="name_desc">Z - A</option>
                                <option value="age_asc">Més jove primer</option>
                                <option value="age_desc">Més adult primer</option>
                            </select>
                        </div>
                    </div>

                    {/* Fila 2: Filtres Secundaris */}
                    <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-gray-100">
                        <select
                            value={filterSpecies}
                            onChange={(e) => setFilterSpecies(e.target.value)}
                            className="text-sm bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="">Totes les espècies</option>
                            {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                            value={filterBreed}
                            onChange={(e) => setFilterBreed(e.target.value)}
                            className="text-sm bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer max-w-[200px] truncate"
                        >
                            <option value="">Totes les races</option>
                            {uniqueBreeds.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>

                        <select
                            value={filterSize}
                            onChange={(e) => setFilterSize(e.target.value)}
                            className="text-sm bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="">Totes les mides</option>
                            <option value="Petit">Petit</option>
                            <option value="Mitjà">Mitjà</option>
                            <option value="Gran">Gran</option>
                        </select>

                        <select
                            value={filterAge}
                            onChange={(e) => setFilterAge(e.target.value)}
                            className="text-sm bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="">Totes les edats</option>
                            <option value="pup">Cadells (&lt; 1 any)</option>
                            <option value="young">Joves (1 a 3 anys)</option>
                            <option value="adult">Adults (4 a 7 anys)</option>
                            <option value="senior">Sèniors (&gt; 7 anys)</option>
                        </select>

                        {(searchQuery || filterSpecies || filterBreed || filterSize || filterAge) && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterSpecies(''); setFilterBreed(''); setFilterSize(''); setFilterAge(''); }}
                                className="text-xs text-indigo-600 hover:bg-indigo-50 font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer border border-indigo-100 outline-none flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                Netejar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {animals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">El teu llistat està buit</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">No hi ha animals registrats a la plataforma. Afegeix el primer perquè aparegui a la recerca.</p>
                    <Link to="/admin/animals/new">
                        <button className="text-indigo-600 bg-white border border-indigo-200 font-bold px-6 py-2 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer outline-none">
                            Afegeix el primer animal
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    {filteredAndSortedAnimals.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-gray-500 mb-2">Cap animal coincideix amb el teu filtre.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setFilterSpecies(''); setFilterBreed(''); setFilterSize(''); setFilterAge(''); }}
                                className="text-indigo-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
                            >
                                Netejar filtres per veure'ls tots
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Perfil</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipus</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Edat Principal</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Accions d'Edició</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAndSortedAnimals.map((animal) => (
                                        <tr key={animal.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                                                        <img
                                                            src={animal.photo_urls?.[0] || 'https://via.placeholder.com/48?text=?'}
                                                            alt={animal.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 border-none outline-none">{animal.name}</div>
                                                        <div className="text-xs text-gray-500">{animal.breed || 'Sense raça particular'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 border border-blue-100 text-blue-700 w-fit">
                                                        {animal.species} • {animal.size || 'Mida desconeguda'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 ml-1">{animal.sex || 'Sexe no definit'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    {formatAgeText(animal.birth_date)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-3 flex-wrap">
                                                    <button
                                                        onClick={() => navigate(`/admin/animals/${animal.id}`)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                                                        title="Editar Fitxa"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(animal.id, animal.name)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer border border-red-100 shadow-sm"
                                                        title="Eliminar Animal"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
