// Importem els hooks de React per estat i efectes secundaris
import { useState, useEffect } from 'react';
// Importem eines pròpies per obtenir l'usuari actual i parlar amb el servidor
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
// Importem el nostre component Card que hem documentat anteriorment
import Card from '../../components/ui/Card';

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
        <div>
            {/* Títol Gran de la secció */}
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Panell de Control</h1>

            {/* DISSENY GRID (Graella)
                - 'grid-cols-1': Per mòbil ho posem tot en una columna (apilat).
                - 'md:grid-cols-3': A partir de pantalles mitjanes (tablets/desktops), dividim en 3 columnes.
                - 'gap-6': Que hi hagi bona separació entre les targetes.
            */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. TARGETA: Recompte d'Animals */}
                {/* Aquí veuràs com utilitzem el nostre component general <Card> d'abans! */}
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Animals</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{animalCount}</p>
                    <p className="text-sm text-gray-500 mt-1">En adopció</p>
                </Card>

                {/* 2. TARGETA: Leads (Estadístiques futures) */}
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Leads</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">-</p>
                    {/* Això recordarà als programadors que aquesta part encara no està feta */}
                    <p className="text-sm text-gray-500 mt-1">Pendent d'implementar</p>
                </Card>

                {/* 3. TARGETA: Resum de l'Usuari */}
                <Card>
                    <h3 className="text-lg font-medium text-gray-900">Usuari</h3>
                    {/* Mostrem el nom i, si no hi ha nom, mostrem l'email com a precaució */}
                    <p className="text-lg mt-2">{user?.name || user?.email}</p>
                    {/* username sol ser un codi o nickname */}
                    <p className="text-sm text-gray-500">{user?.username}</p>
                </Card>

            </div>
        </div>
    );
}
