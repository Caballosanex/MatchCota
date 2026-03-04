// Importem React per poder utilitzar les característiques d'aquesta llibreria
import React from 'react';

/**
 * COMPONENTE: Card (Targeta de Contingut)
 * ----------------------------------------------------------------------
 * Propòsit: Aquest component s'encarrega de crear un "contenidor visual" atractiu
 * en forma de targeta (fons blanc, ombra suau, vores arrodonides). 
 * És molt útil per agrupar informació (com les dades d'un animal o un formulari)
 * de manera neta i separada de la resta de la pàgina.
 * 
 * @param {ReactNode} children - El contingut que posarem DINS de la targeta (text, formularis, imatges...).
 * @param {string} className - Classes CSS addicionals per personalitzar la targeta si cal (ex: 'mb-4' per marge a sota).
 * @param {boolean} noPadding - Si és "true", la targeta NO tindrà espai interior (padding). Útil si volem que una imatge toqui les vores.
 */
export default function Card({
    children,
    className = '',     // Per defecte, no hi afegim cap classe extra.
    noPadding = false   // Per defecte, la targeta SÍ que tindrà espai interior acolxat.
}) {
    // 1. DISSENY EXTERIOR DE LA TARGETA:
    // Apliquem sempre el fons blanc ('bg-white'), amaguem el que sobresurt ('overflow-hidden'),
    // li donem una ombra ('shadow') i arrodonim les cantonades ('rounded-lg').
    // Finalment, hi afegim qualsevol classe extra que ens passin ({className}).
    return (
        <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>

            {/* 2. ESPAIAT INTERIOR (PADDING): */}
            {/* Utilitzem un operador ternari (condició ? sí : no) per decidir l'espai interior.
                - Si 'noPadding' és cert: deixem la classe buida ('').
                - Si 'noPadding' és fals (per defecte): apliquem 'px-4 py-5 sm:p-6' per tenir un espaiat bonic.
            */}
            <div className={noPadding ? '' : 'px-4 py-5 sm:p-6'}>

                {/* 3. CONTINGUT: */}
                {/* Aquí és on es renderitzarà tot allò que hàgim posat entre <Card> i </Card> al nostre codi. */}
                {children}

            </div>
        </div>
    );
}
