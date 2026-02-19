const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const getAnimals = async (tenantSlug) => {
    const headers = { 'Content-Type': 'application/json' };
    if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug;
    }

    const response = await fetch(`${API_URL}/animals`, { headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al carregar els animals');
    }

    return await response.json();
};

export const getAnimal = async (animalId, tenantSlug) => {
    const headers = { 'Content-Type': 'application/json' };
    if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug;
    }

    const response = await fetch(`${API_URL}/animals/${animalId}`, { headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al carregar l'animal");
    }

    return await response.json();
};
