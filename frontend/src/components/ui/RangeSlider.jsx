export default function RangeSlider({
    label,
    name,
    value,
    onChange,
    min = 0,
    max = 10,
    step = 0.5,
    description = '',
}) {
    const displayValue = value !== '' && value !== null && value !== undefined ? value : '-';

    const handleChange = (e) => {
        onChange(name, parseFloat(e.target.value));
    };

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="text-sm font-semibold text-primary">{displayValue}</span>
            </div>
            {description && (
                <p className="text-xs text-gray-500 mb-1">{description}</p>
            )}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value || 0}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}
