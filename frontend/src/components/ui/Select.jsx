import React, { forwardRef } from 'react';

const Select = forwardRef(({
    label,
    error,
    className = '',
    children,
    ...props
}, ref) => {
    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label className="mb-1 text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <select
                ref={ref}
                className={`
                    block w-full rounded-md border shadow-sm sm:text-sm
                    focus:border-blue-500 focus:ring-blue-500
                    disabled:cursor-not-allowed disabled:bg-gray-50
                    ${error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
                `}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default Select;
