import { useState } from 'react';

export default function PhotoGallery({ photos = [] }) {
    const [selected, setSelected] = useState(0);

    if (!photos || photos.length === 0) return null;

    return (
        <div>
            <img
                src={photos[selected]}
                alt={`Foto ${selected + 1}`}
                className="w-full max-h-96 object-cover rounded-lg"
            />
            {photos.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                    {photos.map((url, i) => (
                        <button
                            key={i}
                            onClick={() => setSelected(i)}
                            className={`flex-shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 transition-colors
                                ${i === selected ? 'border-blue-500' : 'border-transparent hover:border-gray-300'}`}
                        >
                            <img
                                src={url}
                                alt={`Thumbnail ${i + 1}`}
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
