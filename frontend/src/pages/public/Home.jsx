import { Link } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant'

export default function Home() {
    const { tenant } = useTenant()

    return (
        <div className="bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center py-12">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">

                <h1 className="text-4xl font-bold text-primary mb-4">
                    {tenant?.name || 'MatchCota'}
                </h1>

                <p className="text-gray-600 mb-6">
                    Plataforma per connectar protectores amb adoptants
                </p>

                <div className="space-y-3">
                    <Link
                        to="/animals"
                        className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors"
                    >
                        Veure Animals en Adopcio
                    </Link>
                    <Link
                        to="/test"
                        className="block w-full text-center py-2 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary/10 transition-colors"
                    >
                        Test de Compatibilitat
                    </Link>
                </div>
            </div>
        </div>
    )
}
