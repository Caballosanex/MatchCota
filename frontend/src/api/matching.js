/**
 * API client per al sistema de Matching.
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Obte el questionari de matching.
 * @param {string} tenantSlug - Slug de la protectora
 * @returns {Promise<Object>} - Questionari amb preguntes i categories
 */
export const getQuestionnaire = async (tenantSlug) => {
    const headers = { 'Content-Type': 'application/json' };
    if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug;
    }

    const response = await fetch(`${API_URL}/matching/questionnaire`, { headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al carregar el questionari');
    }

    return await response.json();
};

/**
 * Calcula els matches basats en les respostes del questionari.
 * @param {string} tenantSlug - Slug de la protectora
 * @param {Object} data - Dades del formulari
 * @param {Object} data.responses - Respostes del questionari {question_id: answer_value}
 * @param {number} [data.limit=10] - Nombre maxim de resultats
 * @returns {Promise<Object>} - Resultats amb matches i puntuacions
 */
export const calculateMatches = async (tenantSlug, data) => {
    const headers = { 'Content-Type': 'application/json' };
    if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug;
    }

    const response = await fetch(`${API_URL}/matching/calculate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al calcular els matches');
    }

    return await response.json();
};
