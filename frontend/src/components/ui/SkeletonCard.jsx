/**
 * COMPONENT: SkeletonCard
 * ----------------------------------------------------------------------
 * QUÈ FA I PER A QUÈ SERVEIX AQUEST COMPONENT?
 * 
 * Un "Skeleton" és una pràctica de disseny modern (UI/UX) que consisteix 
 * en ensenyar "la carcassa" o l'esquelet gris del teu disseny original abans
 * no arribin les dades reals de l'API o del servidor. 
 * 
 * S'ha dissenyat perquè les seves classes CSS i padding coincideixin EXACTAMENT
 * amb el component `Card` amb `noPadding={true}` de `Animals.jsx`.
 */
export default function SkeletonCard() {
    return (
        // CONTENIDOR PRINCIPAL AMB ANIMACIÓ DE 'PULSACIÓ'
        // Ara té exactament les mateixes classes base que el Card real: `bg-white overflow-hidden shadow rounded-lg`
        <div className="bg-white overflow-hidden shadow rounded-lg animate-pulse h-full flex flex-col">

            {/* 1. ESPAI PER LA IMATGE FANTASMA */}
            {/* Mateixa alçada exacta (h-48) i amplada completa (w-full) que a Animals.jsx */}
            <div className="h-48 w-full bg-gray-200 shrink-0"></div>

            {/* 2. ESPAI PER LA INFORMACIÓ INFERIOR FANTASMA */}
            {/* Mateix padding de la caixa de sota (p-4) */}
            <div className="p-4 flex flex-col flex-grow justify-between">
                <div>
                    {/* Línia representant el TÍTOL principal de l'animal */}
                    <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>

                    {/* Línia representant el SUBTÍTOL (espècie i raça) */}
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>

                {/* Caixa pel BUTÓ */}
                <div className="mt-4">
                    {/* El botó real és 'size="sm"' que sol ser un h-8 (32px) aprox */}
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
            </div>
        </div>
    );
}
