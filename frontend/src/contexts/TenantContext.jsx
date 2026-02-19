import { createContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                // Obtenir el subdomini o query param
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
                }
                // [DEV] Si estem a localhost sense ?tenant=, NO assignem cap tenant.
                // Això fa que App.jsx mostri la landing de MatchCota (plataforma).
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
                        throw new Error('Tenant not found');
                    }

                    const tenantData = await response.json();
                    setTenant(tenantData);
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
