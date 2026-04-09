import { createContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../api/baseUrl';
import { resolveHostContext } from '../routing/hostRouting';

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
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                const hostContext = resolveHostContext();
                const isProduction = hostContext.isProduction;

                const searchParams = new URLSearchParams(window.location.search);
                const tenantParam = searchParams.get('tenant');

                let subdomain = '';
                const invalidProductionHost = hostContext.invalidHost;

                if (isProduction) {
                    subdomain = hostContext.tenantSlug;
                } else {
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
