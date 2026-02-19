import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export default function AdminLayout() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { state: { from: location } });
        }
    }, [user, loading, navigate, location]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregant...</div>;
    }

    if (!user) {
        return null; // Redirecting...
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 bg-gray-800">
                    <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
                        <span className="text-xl font-bold text-white">Admin Panel</span>
                    </div>
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <nav className="flex-1 px-2 py-4 space-y-1">
                            <Link to="/admin/dashboard" className="bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Dashboard
                            </Link>
                            <Link to="/admin/animals" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Gestió Animals
                            </Link>
                            <Link to="/admin/leads" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Leads
                            </Link>
                            <Link to="/admin/settings" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                                Configuració
                            </Link>
                        </nav>
                    </div>
                    <div className="flex-shrink-0 flex bg-gray-700 p-4">
                        <div className="flex items-center w-full">
                            <div className="ml-3">
                                <p className="text-sm font-medium text-white">{user.name || user.email}</p>
                                <button
                                    onClick={logout}
                                    className="text-xs font-medium text-gray-300 hover:text-white"
                                >
                                    Tancar Sessió
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                <main className="flex-1 relative overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
