import { getApiBaseUrl } from './baseUrl';

const API_URL = getApiBaseUrl();

/**
 * Llista tots els tenants (protectores) registrades.
 * [DEV] En producció aquest endpoint serà privat o no existirà.
 */
export async function getTenants() {
    const response = await fetch(`${API_URL}/tenants/`, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error fetching tenants');
    }

    return response.json();
}

/**
 * Creates a new tenant.
 * @param {Object} tenantData - The data for the new tenant.
 * @returns {Promise<Object>} - The created tenant object.
 */
export async function createTenant(tenantData) {
    const response = await fetch(`${API_URL}/tenants/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error creating tenant');
    }

    return response.json();
}
