import { createContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                const hostname = window.location.hostname;
                const parts = hostname.split('.');

                const searchParams = new URLSearchParams(window.location.search);
                const tenantParam = searchParams.get('tenant');

                let subdomain = '';
                if (tenantParam) {
                    // Query param ?tenant=slug per desenvolupament local
                    subdomain = tenantParam;
                } else if (parts.length > 2) {
                    // Subdomini real (protectora-barcelona.matchcota.com)
                    subdomain = parts[0];
                } else {
                    // [DEV] Si no hi ha ?tenant= ni subdomini, mirem sessionStorage.
                    // Això permet refrescar la pàgina sense perdre el tenant actiu.
                    // En producció, el subdomini sempre estarà present.
                    subdomain = sessionStorage.getItem('matchcota_tenant_slug') || '';
                }

                // [DEV] Si estem a localhost sense cap tenant, NO assignem cap tenant.
                // Això fa que la landing de MatchCota (plataforma) es mostri.
                //
                // [PROD] A AWS, cada protectora tindrà el seu subdomini creat
                // per una Lambda durant l'onboarding. La landing de MatchCota
                // i la de les protectores aniran per separat (dominis/apps diferents).

                if (subdomain) {
                    const response = await fetch('/api/v1/tenants/current', {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Tenant-Slug': subdomain
                        }
                    });

                    if (!response.ok) {
                        sessionStorage.removeItem('matchcota_tenant_slug');
                        throw new Error('Tenant not found');
                    }

                    const tenantData = await response.json();
                    setTenant(tenantData);
                    // Guardar slug a sessionStorage per persistir entre navegacions
                    sessionStorage.setItem('matchcota_tenant_slug', tenantData.slug);
                }
                // Si no hi ha subdomain, tenant queda null → landing de plataforma

            } catch (err) {
                setError(err.message);
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
