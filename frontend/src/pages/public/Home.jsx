import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant'

export default function Home() {
    const [apiStatus, setApiStatus] = useState('checking...')
    const { tenant } = useTenant()

    useEffect(() => {
        fetch('/api/v1/health')
            .then(res => res.json())
            .then(data => setApiStatus(data.status))
            .catch(() => setApiStatus('error'))
    }, [])

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-bold text-primary mb-4">
                    {tenant?.name || 'MatchCota'}
                </h1>
                <p className="text-gray-600 mb-6">
                    Plataforma per connectar protectores amb adoptants
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-semibold">
                        Frontend funcionant!
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                        API Status: <span className="font-mono">{apiStatus}</span>
                    </p>
                </div>

                <div className="space-y-3">
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

                <div className="mt-6 text-sm text-gray-500 border-t pt-4">
                    <p>Sprint 3: Frontend Estructura</p>
                    <p>Team ASIX - DAW1 - DAW2</p>
                </div>
            </div>
        </div>
    )
}
