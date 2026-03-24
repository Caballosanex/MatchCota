// Importem eines bàsiques de React per guardar dades i executar codi en obrir la pàgina
import { useState, useEffect } from 'react'
// Link serveix per navegar sense recarregar la pàgina sencera (funciona d'acord amb BrowserRouter)
import { Link } from 'react-router-dom'
// Importem el custom hook que ens permet saber quina protectora estem visitant
import { useTenant } from '../../hooks/useTenant'

/**
 * COMPONENT PÀGINA: Home (Inici Públic)
 * ----------------------------------------------------------------------
 * Aquest és el portal principal d'una protectora en concret.
 * Exemple: Si algú entra a refugibcn.matchcota.com, veurà aquesta pàgina.
 */
export default function Home() {
    // 1. ESTAT LOCAL: Volem saber si el backend respon per avisar a l'usuari
    const [apiStatus, setApiStatus] = useState('checking...')

    // 2. CONTEXT: Obtenim la informació de la protectora actual (nom, logos...)
    const { tenant } = useTenant()

    /**
     * EFECTE D'INICIACIÓ
     * Només carregar la pàgina, fem una petita trucada al servidor darrere (backend)
     * per confirmar que està viu. És útil durant el desenvolupament (Sprints inicis).
     */
    useEffect(() => {
        // Trucada de xarxa a la ruta /health
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        fetch(`${apiUrl}/health`)
            .then(res => res.json())
            .then(data => setApiStatus(data.status)) // Si respon, guardem l'estatus (ex: 'ok')
            .catch(() => setApiStatus('error'))      // Si cau la petició, guardem 'error'
    }, []) // Array buit = només un cop al principi

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">

                {/* Títol Dinàmic: Mostrem el nom de la protectora o 'MatchCota' per defecte */}
                <h1 className="text-4xl font-bold text-primary mb-4">
                    {tenant?.name || 'MatchCota'}
                </h1>

                <p className="text-gray-600 mb-6">
                    Plataforma per connectar protectores amb adoptants
                </p>

                {/* Targeta Verda: Feedback tècnic de que tot funciona */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-semibold">
                        Frontend funcionant!
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                        API Status: <span className="font-mono">{apiStatus}</span>
                    </p>
                </div>

                {/* Botons de navegació ràpida */}
                <div className="space-y-3">
                    {/* Utilitzem <Link to="..."> en comptes de <a href="..."> perquè sigui ultra-ràpid */}
                    <Link
                        to="/animals"
                        className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Veure Animals en Adopcio
                    </Link>
                    <Link
                        to="/test"
                        className="block w-full text-center py-2 px-4 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
                    >
                        Test de Compatibilitat
                    </Link>
                </div>

                {/* Rodapeu intern identificatiu de l'Sprint */}
                <div className="mt-6 text-sm text-gray-500 border-t pt-4">
                    <p>Sprint 3: Frontend Estructura</p>
                    <p>Team ASIX - DAW1 - DAW2</p>
                </div>
            </div>
        </div>
    )
}
