import React from 'react';

export default function Card({
    children,
    className = '',
    noPadding = false
}) {
    return (
        <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
            <div className={noPadding ? '' : 'px-4 py-5 sm:p-6'}>
                {children}
            </div>
        </div>
    );
}
