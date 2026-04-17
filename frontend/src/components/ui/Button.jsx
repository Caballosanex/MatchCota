import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    ...props
}) {
    const estilsBase = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

    const estilsPerVariant = {
        primary: 'bg-primary text-white shadow-sm shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/35 focus:ring-primary/40',
        secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/70 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-300',
        danger: 'bg-red-600 text-white shadow-sm shadow-red-500/20 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/30 focus:ring-red-300',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
        outline: 'border border-slate-300 bg-white/90 text-slate-700 hover:border-primary/40 hover:text-primary-dark focus:ring-primary/25'
    };

    const estilsPerMida = {
        sm: 'px-3.5 py-2 text-sm',
        md: 'px-5 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <button
            className={`${estilsBase} ${estilsPerVariant[variant]} ${estilsPerMida[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}

            {children}
        </button>
    );
}
