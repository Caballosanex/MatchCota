import React from 'react';

export default function Card({
    children,
    className = '',
    noPadding = false
}) {
    const cardShell = 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200';
    const cardPadding = noPadding ? '' : 'px-5 py-5 sm:px-6 sm:py-6';

    return (
        <div className={`${cardShell} ${className}`}>
            <div className={cardPadding}>
                {children}
            </div>
        </div>
    );
}
