import { createContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../api/baseUrl';

const TenantContext = createContext();

const TENANT_NOT_FOUND_HEADLINE = 'We could not find that shelter';
const TENANT_NOT_FOUND_BODY =
    'Verify the subdomain spelling, or return to https://matchcota.tech to register or locate your shelter URL.';

const ALLOWED_SUBDOMAIN_PATTERN = /^[a-z0-9-]+$/;

function buildTenantNotFoundError() {
    return {
        type: 'tenant-not-found',
        title: TENANT_NOT_FOUND_HEADLINE,
        message: TENANT_NOT_FOUND_BODY,
        recoveryUrl: 'https://matchcota.tech'
    };
}

function normalizeHostname(hostname) {
    return (hostname || '').toLowerCase().trim();
}

function getProductionSubdomain(hostname, baseDomain) {
    if (!hostname || !baseDomain) return { tenantSlug: '', invalidHost: true };

    if (hostname === baseDomain) {
        return { tenantSlug: '', invalidHost: false };
    }

    const suffix = `.${baseDomain}`;
    if (!hostname.endsWith(suffix)) {
        return { tenantSlug: '', invalidHost: true };
    }

    const tenantSlug = hostname.slice(0, -suffix.length);
    if (!tenantSlug || tenantSlug.includes('.') || !ALLOWED_SUBDOMAIN_PATTERN.test(tenantSlug)) {
        return { tenantSlug: '', invalidHost: true };
    }

    return { tenantSlug, invalidHost: false };
}

export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                const hostname = normalizeHostname(window.location.hostname);
                const environment = (import.meta.env.VITE_ENVIRONMENT || 'development').toLowerCase();
                const isProduction = environment === 'production';
                const baseDomain = normalizeHostname(import.meta.env.VITE_BASE_DOMAIN || 'matchcota.tech');

                const searchParams = new URLSearchParams(window.location.search);
                const tenantParam = searchParams.get('tenant');

                let subdomain = '';
                let invalidProductionHost = false;

                if (isProduction) {
                    const productionResolution = getProductionSubdomain(hostname, baseDomain);
                    subdomain = productionResolution.tenantSlug;
                    invalidProductionHost = productionResolution.invalidHost;
                } else {
                    const parts = hostname.split('.');
                    if (tenantParam) {
                        subdomain = tenantParam;
                    } else if (parts.length > 2) {
                        subdomain = parts[0];
                    } else {
                        subdomain = sessionStorage.getItem('matchcota_tenant_slug') || '';
                    }
                }

                if (invalidProductionHost) {
                    sessionStorage.removeItem('matchcota_tenant_slug');
                    setTenant(null);
                    setError(buildTenantNotFoundError());
                    return;
                }

                if (subdomain) {
                    const apiUrl = getApiBaseUrl();
                    const response = await fetch(`${apiUrl}/tenants/current`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Tenant-Slug': subdomain
                        }
                    });

                    if (!response.ok) {
                        sessionStorage.removeItem('matchcota_tenant_slug');
                        setTenant(null);
                        if (response.status === 404 && isProduction) {
                            setError(buildTenantNotFoundError());
                            return;
                        }
                        throw new Error('Failed to load tenant context.');
                    }

                    const tenantData = await response.json();
                    setTenant(tenantData);
                    sessionStorage.setItem('matchcota_tenant_slug', tenantData.slug);
                    setError(null);
                } else {
                    setTenant(null);
                    setError(null);
                }
            } catch (err) {
                setTenant(null);
                setError(err.message || 'Failed to resolve tenant context.');
            } finally {
                setLoading(false);
            }
        };

        detectTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
}

export default TenantContext;
