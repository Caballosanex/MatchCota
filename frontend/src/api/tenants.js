const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
