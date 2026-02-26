// Importem React i el mètode 'forwardRef'.
// forwardRef és una eina avançada de React que ens permet "passar" una referència (ref)
// des d'un component pare (qui utilitza aquest Input) directament a l'element HTML <input> natiu de dins.
import React, { forwardRef } from 'react';

/**
 * COMPONENTE: Input (Camp de Text)
 * ----------------------------------------------------------------------
 * Propòsit: Aquest component crea un camp de text estilitzat i preparat per formularis.
 * Inclou per defecte el seu propi disseny, espai per a una etiqueta (label) a dalt,
 * i gestió d'errors visuals (vora vermella i missatge a sota).
 * 
 * Envoltem tota la nostra funció amb 'forwardRef' perquè formularis complexos (com React Hook Form)
 * necessiten accedir directament a l'element <input> de dins per llegir el seu valor.
 * 
 * @param {string} label - El text que apareixerà just a sobre del camp (ex: "Nom d'usuari").
 * @param {string} error - El text de l'error si l'usuari s'ha equivocat. Si existeix, es pinta de vermell.
 * @param {string} className - Classes CSS extres pel contenidor general (no per a l'input en si).
 * @param {Object} props - Qualsevol altra propietat d'un <input> o <textarea> (value, onChange, placeholder, type...).
 */
const Input = forwardRef(({
    label,
    error,
    className = '',
    ...props
}, ref) => { // Fixa't que ara rebem un segon paràmetre: 'ref'

    return (
        // Contenidor principal per al label, l'input i el missatge d'error
        <div className={`flex flex-col ${className}`}>

            {/* 1. L'ETIQUETA (LABEL):
                Només la mostrem si ens han passat la propietat 'label'.
                La tinguem com un text petit, en negreta i fosc just a dalt de l'input.
            */}
            {label && (
                <label className="mb-1 text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            {/* 2. EL CAMP DE TEXT REAL (INPUT): */}
            <input
                // Connectem el 'ref' que ens ve des de fora a aquest input específic
                ref={ref}

                // Els estils base barrejats amb una condició d'error.
                // Si hi ha 'error', afegim vores i lletres vermelles. Si no, mantenim un gris tranquil.
                className={`
                    block w-full rounded-md shadow-sm sm:text-sm
                    focus:outline-none focus:ring-1 transition-colors
                    disabled:cursor-not-allowed disabled:bg-gray-50
                    ${error
                        ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500 placeholder-red-300'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }
                `}

                // Passem la resta de propietats HTML al final com onChange, type="email", etc.
                {...props}
            />

            {/* 3. MISSATGE D'ERROR:
                Si ens han passat un text d'error, el pintem just a sota de l'input en color vermell petit.
            */}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

        </div>
    );
});

// Com que estem utilitzant 'forwardRef', de vegades les eines d'inspecció de React 
// perden el nom real del component en pantalla. Amb això li diem explícitament al navegador com es diu.
Input.displayName = 'Input';

export default Input;
