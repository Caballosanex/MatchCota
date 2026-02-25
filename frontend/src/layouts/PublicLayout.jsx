import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';

export default function PublicLayout() {
    const { tenant } = useTenant();
    const location = useLocation();

    const isAuthPage = ['/login', '/register-tenant'].includes(location.pathname);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/" className="text-2xl font-bold text-blue-600">
                                    {tenant ? tenant.name : 'MatchCota'}
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link to="/" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Inici
                                </Link>
                                <Link to="/animals" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Animals
                                </Link>
                                <Link to="/test" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Test Compatibilitat
                                </Link>
                            </div>
                            <div className="flex items-center">
                                <Link to="/login" className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium border border-indigo-200 hover:bg-indigo-50 transition-colors">
                                    Ja tens compte? Inicia sessió
                                </Link>
                            </div>
                        </div>
                    </div>
            </header>
            )}

            {/* Main Content */}
            <main className={`flex-grow ${isAuthPage ? 'flex flex-col' : ''}`}>
                <div className={isAuthPage ? 'w-full h-full p-0' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
                    <Outlet />
                </div>
            </main>

            {/* Footer */}
            {!isAuthPage && (
                <footer className="bg-white border-t border-gray-200">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-500">
                            &copy; {new Date().getFullYear()} {tenant ? tenant.name : 'MatchCota'}. Tots els drets reservats.
                        </p>
                    </div>
                </footer>
            )}
        </div>
    );
}
