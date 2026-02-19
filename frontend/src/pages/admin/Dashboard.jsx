import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';

export default function Dashboard() {
    const { user } = useAuth();

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Panell de Control</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Animals</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
                    <p className="text-sm text-gray-500 mt-1">En adopció</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Leads</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">5</p>
                    <p className="text-sm text-gray-500 mt-1">Nous interessats</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Usuari</h3>
                    <p className="text-lg mt-2">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.role}</p>
                </Card>
            </div>
        </div>
    );
}
