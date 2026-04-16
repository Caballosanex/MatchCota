/**
 * COMPONENT PAGINA: MatchResults
 * ----------------------------------------------------------------------
 * Mostra els resultats del test de compatibilitat.
 * Presenta els animals ordenats per score amb explicacions.
 */
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { submitPublicLead } from '../../api/leadsPublic';
import { buildLeadPayload } from '../../utils/leadPayload';

// Placeholder per imatges sense foto
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300?text=Sense+Foto';

export function validateLeadForm({ name, email, phone }) {
  const fieldErrors = {};

  if (!name.trim()) {
    fieldErrors.name = 'El nom es obligatori.';
  }

  if (!email.trim() && !phone.trim()) {
    fieldErrors.contact = 'Introdueix email o telefon perque et puguin contactar.';
  }

  return fieldErrors;
}

export default function MatchResults() {
  const location = useLocation();
  const { tenant } = useTenant();
  const { results, responses } = location.state || {};

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!results) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No hi ha resultats</h2>
        <p className="text-gray-600 mb-6">Sembla que no has completat el test de compatibilitat.</p>
        <Link
          to="/test"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Fer el test
        </Link>
      </div>
    );
  }

  const { matches = [], total_animals = 0 } = results;
  const topMatch = matches[0] || null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getAgeLabel = (category) => {
    const labels = {
      puppy: 'Cadell',
      young: 'Jove',
      adult: 'Adult',
      senior: 'Senior',
    };
    return labels[category] || category;
  };

  const handleSubmitLead = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = validateLeadForm({ name, email, phone });
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildLeadPayload({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        responses,
        matches,
        totalAnimals: total_animals,
      });

      await submitPublicLead(tenant?.slug, payload);
      setIsSubmitted(true);
    } catch {
      setSubmitError('No hem pogut enviar el teu interes. Revisa les dades i torna-ho a provar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Els teus millors matches!</h1>
        <p className="text-gray-600">
          Hem analitzat {total_animals} animals i aquests son els que millor encaixen amb tu.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 text-lg">No hem trobat animals disponibles en aquest moment.</p>
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
              className={`bg-white rounded-xl shadow-lg overflow-hidden ${index === 0 ? 'ring-2 ring-indigo-500' : ''}`}
            >
              {index === 0 && (
                <div className="bg-indigo-600 text-white text-center py-2 text-sm font-semibold">
                  El teu millor match!
                </div>
              )}

              <div className="md:flex">
                <div className="md:w-1/3">
                  <img
                    src={match.photo_url || PLACEHOLDER_IMAGE}
                    alt={match.name}
                    className="w-full h-64 md:h-full object-cover"
                  />
                </div>

                <div className="md:w-2/3 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{match.name}</h2>
                      <p className="text-gray-500">
                        {match.breed || match.species}
                        {match.sex && ` - ${match.sex}`}
                      </p>
                    </div>

                    <div className={`px-4 py-2 rounded-full font-bold text-lg ${getScoreColor(match.score)}`}>
                      {match.score}%
                    </div>
                  </div>

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

                  {match.description && <p className="text-gray-600 mb-4 line-clamp-2">{match.description}</p>}

                  {match.explanations && match.explanations.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Per que es un bon match:</h3>
                      <ul className="space-y-1">
                        {match.explanations.map((exp, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-600">
                            <svg
                              className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {exp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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

      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        {isSubmitted ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <h2 className="text-2xl font-bold text-gray-900">Gracies! Hem rebut el teu interes</h2>
            </div>
            <p className="text-gray-600 mb-6">
              El refugi revisara la teva sol.licitud i et contactara pel canal indicat.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/animals"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center"
              >
                Veure tots els animals
              </Link>
              {topMatch && (
                <Link
                  to={`/animals/${matches[0].id}`}
                  className="px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-center"
                >
                  Veure perfil del millor match
                </Link>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitLead}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">T'ha agradat algun match? Deixa'ns el teu contacte</h2>
            <p className="text-gray-600 mb-6">
              El refugi et contactara aviat si veu encaix amb algun dels animals.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="lead-name" className="block text-sm font-semibold text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="lead-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="lead-email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="lead-phone" className="block text-sm font-semibold text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.contact && <p className="mt-1 text-sm text-red-600">{fieldErrors.contact}</p>}
              </div>
            </div>

            <div className="mt-6">
              {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviant...' : 'Enviar interes'}
              </button>
            </div>
          </form>
        )}
      </div>

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
