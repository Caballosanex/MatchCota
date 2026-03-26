/**
 * COMPONENT PAGINA: MatchResults
 * ----------------------------------------------------------------------
 * Mostra els resultats del test de compatibilitat.
 * Presenta els animals ordenats per score amb explicacions.
 */
import { useLocation, Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';

// Placeholder per imatges sense foto
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300?text=Sense+Foto';

export default function MatchResults() {
    const location = useLocation();
    const { tenant } = useTenant();

    // Obtenir resultats del state de navegacio
    const { results } = location.state || {};

    // Si no hi ha resultats, redirigir al test
    if (!results) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    No hi ha resultats
                </h2>
                <p className="text-gray-600 mb-6">
                    Sembla que no has completat el test de compatibilitat.
                </p>
                <Link
                    to="/test"
                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Fer el test
                </Link>
            </div>
        );
    }

    const { matches, total_animals } = results;

    // Helper per mostrar el score amb color
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-orange-600 bg-orange-100';
    };

    // Helper per mostrar categoria d'edat
    const getAgeLabel = (category) => {
        const labels = {
            puppy: 'Cadell',
            young: 'Jove',
            adult: 'Adult',
            senior: 'Senior',
        };
        return labels[category] || category;
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Els teus millors matches!
                </h1>
                <p className="text-gray-600">
                    Hem analitzat {total_animals} animals i aquests son els que millor encaixen amb tu.
                </p>
            </div>

            {/* Llista de matches */}
            {matches.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 text-lg">
                        No hem trobat animals disponibles en aquest moment.
                    </p>
                    <Link
                        to="/test"
                        className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Repetir el test
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {matches.map((match, index) => (
                        <div
                            key={match.id}
                            className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                                index === 0 ? 'ring-2 ring-indigo-500' : ''
                            }`}
                        >
                            {/* Badge de posicio per al primer */}
                            {index === 0 && (
                                <div className="bg-indigo-600 text-white text-center py-2 text-sm font-semibold">
                                    El teu millor match!
                                </div>
                            )}

                            <div className="md:flex">
                                {/* Imatge */}
                                <div className="md:w-1/3">
                                    <img
                                        src={match.photo_url || PLACEHOLDER_IMAGE}
                                        alt={match.name}
                                        className="w-full h-64 md:h-full object-cover"
                                    />
                                </div>

                                {/* Contingut */}
                                <div className="md:w-2/3 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                {match.name}
                                            </h2>
                                            <p className="text-gray-500">
                                                {match.breed || match.species} 
                                                {match.sex && ` - ${match.sex}`}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        <div className={`px-4 py-2 rounded-full font-bold text-lg ${getScoreColor(match.score)}`}>
                                            {match.score}%
                                        </div>
                                    </div>

                                    {/* Info basica */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {match.size && (
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                {match.size === 'small' ? 'Petit' : match.size === 'medium' ? 'Mitja' : 'Gran'}
                                            </span>
                                        )}
                                        {match.age_category && (
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                {getAgeLabel(match.age_category)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Descripcio */}
                                    {match.description && (
                                        <p className="text-gray-600 mb-4 line-clamp-2">
                                            {match.description}
                                        </p>
                                    )}

                                    {/* Explicacions del match */}
                                    {match.explanations && match.explanations.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                                Per que es un bon match:
                                            </h3>
                                            <ul className="space-y-1">
                                                {match.explanations.map((exp, i) => (
                                                    <li key={i} className="flex items-start text-sm text-gray-600">
                                                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        {exp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Boto veure perfil */}
                                    <Link
                                        to={`/animals/${match.id}`}
                                        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Veure perfil complet
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Accions finals */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    to="/test"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center"
                >
                    Repetir el test
                </Link>
                <Link
                    to="/animals"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center"
                >
                    Veure tots els animals
                </Link>
            </div>
        </div>
    );
}
