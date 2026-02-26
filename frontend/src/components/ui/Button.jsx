// Importem React per poder utilitzar les característiques d'aquesta llibreria
import React from 'react';

/**
 * COMPONENTE: Button (Botó Reutilitzable)
 * ----------------------------------------------------------------------
 * Propòsit: Aquest component és un botó genèric que podem utilitzar a tota l'aplicació.
 * En lloc d'escriure les mateixes classes de TailwindCSS cada vegada que necessitem
 * un botó, utilitzem aquest component que ja té estils predefinits i variants.
 * 
 * @param {ReactNode} children - El contingut que va dins del botó (exemple: el text "Guardar").
 * @param {string} variant - L'estil visual del botó (primary, secondary, danger, etc.).
 * @param {string} size - La mida del botó (sm per petit, md per mitjà, lg per gran).
 * @param {string} className - Classes CSS extres que podem afegir al botó si ho necessitem.
 * @param {boolean} isLoading - Si és "true", el botó mostrarà un cercle girant (spinner) i es desactivarà.
 * @param {Object} props - Qualsevol altra propietat estàndard d'un botó HTML (onClick, disabled, type, etc.).
 */
export default function Button({
    children,
    variant = 'primary', // Per defecte, si no li diem res, serà el botó principal (blau).
    size = 'md',         // Per defecte, mida mitjana.
    className = '',      // Per defecte, cap classe extra.
    isLoading = false,   // Per defecte, no està carregant.
    ...props             // Agafem qualsevol prop addicional (com onClick) utilitzant l'operador "rest".
}) {
    // 1. ESTILS BASE:
    // Aquestes classes s'apliquen SEMPRE al botó, independentment del color o la mida.
    // Fan que el contingut estigui centrat, els cantons arrodonits, i gestionen el contorn quan fem focus.
    const estilsBase = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // 2. VARIANTS DE COLOR:
    // Un diccionari (objecte visual) que relaciona el nom de la variant amb les classes de Tailwind corresponents.
    const estilsPerVariant = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
    };

    // 3. MIDES:
    // Diccionari per als espaiats interiors (padding) i la mida del text segons la propietat "size".
    const estilsPerMida = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <button
            // Combinem tots els estils: Base + Color + Mida + Qualsevol classe extra que ens passin
            className={`${estilsBase} ${estilsPerVariant[variant]} ${estilsPerMida[size]} ${className}`}
            // El botó es desactiva (disabled) si està carregant (isLoading) O si ens passen la propietat disabled explícitament.
            disabled={isLoading || props.disabled}
            // Incorporem aquí totes les altres propietats HTML (com l'onClick)
            {...props}
        >
            {/* Si està carregant (isLoading és true), mostrem aquest icona d'espera (SVG spinner) */}
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}

            {/* Finalment, mostrem el contingut del botó (el text o icones que hi hagi a dins) */}
            {children}
        </button>
    );
}
