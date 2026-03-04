import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

export function useApi() {
    const { user } = useAuth();
    const { tenant } = useTenant();

    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

    const request = async (endpoint, options = {}) => {
        // Guard: si no hi ha tenant, les requests fallaran al backend
        if (!tenant?.slug) {
            throw new Error('No hi ha cap protectora seleccionada.');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (user && user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }

        headers['X-Tenant-Slug'] = tenant.slug;
        headers['X-Tenant-ID'] = tenant.id;

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${baseUrl}${endpoint}`, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    };

    return {
        get: (endpoint) => request(endpoint, { method: 'GET' }),
        post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
        put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
        delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
    };
}
