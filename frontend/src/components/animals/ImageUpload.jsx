import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { getApiBaseUrl } from '../../api/baseUrl';

const API_URL = getApiBaseUrl();
const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024);

export default function ImageUpload({ photos = [], onChange }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);
    const { user } = useAuth();
    const { tenant } = useTenant();

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const headers = {};
        if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
        if (tenant?.slug) headers['X-Tenant-Slug'] = tenant.slug;
        if (tenant?.id) headers['X-Tenant-ID'] = tenant.id;

        const response = await fetch(`${API_URL}/admin/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Error pujant la imatge');
        }

        const data = await response.json();
        return data.url;
    };

    const handleFiles = async (files) => {
        setError(null);
        try {
            for (const file of files) {
                if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                    throw new Error(`La imatge "${file.name}" supera el maxim de ${MAX_UPLOAD_SIZE_MB}MB`);
                }
            }

            setUploading(true);
            const newUrls = [];
            for (const file of files) {
                const url = await uploadFile(file);
                newUrls.push(url);
            }
            onChange([...photos, ...newUrls]);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleRemove = (index) => {
        onChange(photos.filter((_, i) => i !== index));
    };

    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fotos</h3>

            {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {photos.map((url, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={url}
                                alt={`Foto ${i + 1}`}
                                className="h-24 w-full object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(i)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                X
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400'}`}
            >
                <p className="text-sm text-gray-600">
                    {uploading ? 'Pujant...' : 'Arrossega imatges aqui o fes clic per seleccionar'}
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP. Maxim 4MB</p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFiles(Array.from(e.target.files))}
                />
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>
    );
}
