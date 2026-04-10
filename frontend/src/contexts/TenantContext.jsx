import { createContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../api/baseUrl';
import { readTenantPrebootContext } from '../preboot/tenantPreboot';

const TenantContext = createContext();

const TENANT_NOT_FOUND_HEADLINE = 'We could not find that shelter';
const TENANT_NOT_FOUND_BODY =
    'Verify the subdomain spelling, or return to https://matchcota.tech to register or locate your shelter URL.';

function buildTenantNotFoundError() {
    return {
        type: 'tenant-not-found',
        title: TENANT_NOT_FOUND_HEADLINE,
        message: TENANT_NOT_FOUND_BODY,
        recoveryUrl: 'https://matchcota.tech'
    };
}

export function TenantProvider({ children }) {
    const [preboot] = useState(() => readTenantPrebootContext());
    const initialTenant = preboot.tenantHint ? { ...preboot.tenantHint } : null;
    const initialError = preboot.status === 'invalid-host' ? buildTenantNotFoundError() : null;
    const shouldSkipFetch = preboot.status === 'invalid-host' || preboot.status === 'apex-host';

    const [tenant, setTenant] = useState(initialTenant);
    const [loading, setLoading] = useState(!shouldSkipFetch);
    const [error, setError] = useState(initialError);
    const [prebootStatus, setPrebootStatus] = useState(preboot.status);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                if (shouldSkipFetch) {
                    return;
                }

                const hostContext = preboot.hostContext;
                const isProduction = hostContext.isProduction;

                let subdomain = '';
                const invalidProductionHost = hostContext.invalidHost;

                if (preboot.tenantHint?.slug) {
                    subdomain = preboot.tenantHint.slug;
                } else if (isProduction) {
                    subdomain = hostContext.tenantSlug;
                } else {
                    const searchParams = new URLSearchParams(window.location.search);
                    const tenantParam = searchParams.get('tenant');
                    const parts = hostContext.hostname.split('.');

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
                    setPrebootStatus('invalid-host');
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
                            setPrebootStatus('tenant-unresolved');
                            return;
                        }
                        throw new Error('Failed to load tenant context.');
                    }

                    const tenantData = await response.json();
                    setTenant(tenantData);
                    sessionStorage.setItem('matchcota_tenant_slug', tenantData.slug);
                    setError(null);
                    setPrebootStatus('tenant-resolved');
                } else {
                    setTenant(null);
                    setError(null);
                    setPrebootStatus('apex-host');
                }
            } catch (err) {
                setTenant(null);
                setError(err.message || 'Failed to resolve tenant context.');
                setPrebootStatus('tenant-unresolved');
            } finally {
                setLoading(false);
            }
        };

        detectTenant();
    }, [preboot, shouldSkipFetch]);

    return (
        <TenantContext.Provider value={{ tenant, loading, error, prebootStatus }}>
            {children}
        </TenantContext.Provider>
    );
}

export default TenantContext;
