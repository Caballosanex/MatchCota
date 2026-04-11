import { getApiBaseUrl } from './baseUrl';

const API_URL = getApiBaseUrl();
const DEFAULT_TENANT_ERROR_MESSAGE = 'No hem pogut completar el registre del shelter. Torna-ho a provar.';
const DEFAULT_TENANT_ERROR_KEY = 'onboarding.registration_failed';
const DEFAULT_TENANT_ERROR_SUPPORT_CODE = 'CREATE-REQUEST_FAILED';
const DEFAULT_FALLBACK_ACTIONS = ['retry_checks', 'open_tenant_root', 'copy_url'];

function normalizeString(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
}

function normalizeSupportCode(value, fallback) {
    const candidate = normalizeString(value).toUpperCase();
    return candidate || fallback;
}

function normalizeHandoffStatus(value) {
    const handoffStatus = normalizeString(value).toLowerCase();
    return handoffStatus || 'ready';
}

function normalizeFallbackActions(value) {
    if (!Array.isArray(value)) {
        return [...DEFAULT_FALLBACK_ACTIONS];
    }

    const normalized = value
        .map((action) => normalizeString(action).toLowerCase())
        .filter(Boolean)
        .filter((action, index, collection) => collection.indexOf(action) === index);

    return normalized.length ? normalized : [...DEFAULT_FALLBACK_ACTIONS];
}

function normalizeChecks(value, handoffStatus) {
    if (Array.isArray(value)) {
        const byStage = Object.fromEntries(
            value
                .filter((item) => item && typeof item === 'object')
                .map((item) => [normalizeString(item.stage).toLowerCase(), normalizeString(item.status).toLowerCase()])
        );

        return {
            preboot: byStage.preboot || handoffStatus,
            current: byStage.current || handoffStatus,
            login: byStage.login || handoffStatus,
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            preboot: handoffStatus,
            current: handoffStatus,
            login: handoffStatus,
        };
    }

    return {
        preboot: normalizeString(value.preboot),
        current: normalizeString(value.current),
        login: normalizeString(value.login),
    };
}

export function normalizeTenantCreateResponse(payload = {}) {
    const onboarding = payload?.onboarding ?? payload;
    const handoffStatus = normalizeHandoffStatus(onboarding.handoff_status);
    const defaultSupportCode = handoffStatus === 'ready' ? 'CREATE-READY' : 'CREATE-UNRESOLVED';

    return {
        ...payload,
        handoffStatus,
        supportCode: normalizeSupportCode(onboarding.support_code, defaultSupportCode),
        userMessageKey: normalizeString(onboarding.user_message_key) || 'ONBOARDING_READY',
        fallbackActions: normalizeFallbackActions(onboarding.fallback_actions),
        checks: normalizeChecks(onboarding.checks, handoffStatus),
    };
}

function createCuratedTenantError(errorData = {}) {
    const error = new Error(DEFAULT_TENANT_ERROR_MESSAGE);
    error.messageKey = normalizeString(errorData.user_message_key) || DEFAULT_TENANT_ERROR_KEY;
    error.supportCode = normalizeSupportCode(errorData.support_code, DEFAULT_TENANT_ERROR_SUPPORT_CODE);
    error.handoffStatus = normalizeHandoffStatus(errorData.handoff_status || 'unresolved');
    error.fallbackActions = normalizeFallbackActions(errorData.fallback_actions);
    return error;
}

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
        throw createCuratedTenantError(errorData);
    }

    const payload = await response.json();
    return normalizeTenantCreateResponse(payload);
}
