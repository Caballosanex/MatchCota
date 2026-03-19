// Importem els hooks de React per estat i efectes secundaris
import { useState, useEffect } from 'react';
// Importem eines pròpies per obtenir l'usuari actual i parlar amb el servidor
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
// No importem el Card antic, ja que farem targetes noves més modernes


/**
 * COMPONENTE PÀGINA: Dashboard (Panell de Control)
 * ----------------------------------------------------------------------
 * Propòsit: Mostrar un resum visual ràpid (Landing intern) per a l'administrador
 * només entrar al seu panell privat. Actualment mostra un recompte d'animals.
 */
export default function Dashboard() {
    // 1. DADES DEL CONTEXT
    // Traiem l'objecte "user" del nostre AuthContext per poder dir-li "Hola, [Nom]"
    const { user } = useAuth();

    // 2. PREPAREM LES EINES EXTERNES
    // 'useApi' és com 'fetch' però configurat amb el nostre token de seguretat automàticament
    const api = useApi();

    // 3. ESTAT LOCAL
    // Guardem el número d'animals. Comencem amb un guió '-' per indicar que s'està carregant.
    const [animalCount, setAnimalCount] = useState('-');

    /**
     * EFECTE DE CÀRREGA INICIAL
     * Quan s'obre el Dashboard, fem una petita trucada al backend per demanar les dades.
     */
    useEffect(() => {
        // Creem una funció asíncrona dins l'useEffect (és la forma correcta de fer-ho en React)
        const fetchStats = async () => {
            try {
                // Demanem toooooots els animals de la protectora activa.
                // *Nota de rendiment: En un futur, seria millor que el backend tingués una ruta `/animals/count`
                // per no haver de baixar totes les fitxes només per comptar-les.
                const animals = await api.get('/animals');

                // Si allò rebut és una llista (Array) vàlida, n'agafem la longitud (.length)
                if (Array.isArray(animals)) {
                    setAnimalCount(animals.length);
                }
            } catch {
                // Si falla (cau interne per ex.), mantenim el guió per no trencar l'app visualment.
                setAnimalCount('-');
            }
        };

        // Executem la funció just després de declarar-la
        fetchStats();
    }, []); // Els array claudàtors buits [] signifiquen "només una vegada al carregar"

    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">Taulell de Control</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. TARGETA: Recompte d'Animals */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-medium text-gray-800">Animals</h3>
                    <p className="text-4xl font-black text-indigo-600 mt-2">{animalCount}</p>
                    <p className="text-sm text-gray-500 mt-1 font-medium">En adopció al sistema</p>
                </div>

                {/* 2. TARGETA: Leads (Estadístiques futures) */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow opacity-80">
                    <h3 className="text-lg font-medium text-gray-800">Sol·licituds</h3>
                    <p className="text-4xl font-black text-gray-300 mt-2">-</p>
                    <p className="text-sm text-gray-400 mt-1 font-medium">Funció properament</p>
                </div>

                {/* 3. TARGETA: Resum de l'Usuari */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-medium text-gray-800">La teva sessió</h3>
                    <p className="text-xl font-bold text-gray-900 mt-2 truncate">{user?.name || user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1 truncate">{user?.username || 'Administrador'}</p>
                </div>

            </div>
        </div>
    );
}
