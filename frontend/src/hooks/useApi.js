import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

export function useApi() {
    const { user } = useAuth();
    const { tenant } = useTenant();

    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

    const request = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (user && user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }

        if (tenant && tenant.slug) {
            headers['X-Tenant-Slug'] = tenant.slug;
        } else if (tenant && tenant.id === 'default' && import.meta.env.DEV) {
            // Fallback for dev if tenant object is incomplete but we want to force something?
            // But TenantContext should now give us a full object. 
            // Let's stick to tenant.slug.
        }

        // Mantinc l'ID per si de cas algun endpoint el necessita, però el principal és el Slug
        if (tenant) {
            headers['X-Tenant-ID'] = tenant.id;
        }

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
