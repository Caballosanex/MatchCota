import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
    const [apiStatus, setApiStatus] = useState('checking...')

    useEffect(() => {
        fetch('http://localhost:8000/api/v1/health')
            .then(res => res.json())
            .then(data => setApiStatus(data.status))
            .catch(() => setApiStatus('error'))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-bold text-primary mb-4">
                    🐾 MatchCota
                </h1>
                <p className="text-gray-600 mb-6">
                    Plataforma multi-tenant per connectar protectores amb adoptants
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-semibold">
                        ✓ Frontend funcionant!
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                        API Status: <span className="font-mono">{apiStatus}</span>
                    </p>
                </div>

                <div className="space-y-3">
                    <Link to="/register-tenant" className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                        Registrar Protectora
                    </Link>
                </div>

                <div className="mt-6 text-sm text-gray-500">
                    <p>Sprint 1: Docker Setup ✅</p>
                    <p>Team ASIX • DAW1 • DAW2</p>
                </div>
            </div>
        </div>
    )
}
