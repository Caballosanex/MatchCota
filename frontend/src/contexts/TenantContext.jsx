import { createContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                // Obtenir el subdomini
                const hostname = window.location.hostname;
                const parts = hostname.split('.');

                // Check for query param 'tenant' to override logic
                const searchParams = new URLSearchParams(window.location.search);
                const tenantParam = searchParams.get('tenant');

                let subdomain = '';
                if (tenantParam) {
                    subdomain = tenantParam;
                } else if (parts.length > 2) {
                    subdomain = parts[0];
                } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    // Per desenvolupament, usem 'demo' si no hi ha subdomini
                    subdomain = 'demo';
                }

                if (subdomain) {
                    try {
                        // Canvi a ruta relativa per usar el proxy de Vite i correcció a plural 'tenants'
                        const response = await fetch('/api/v1/tenants/current', {
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Tenant-Slug': subdomain
                                // En local, si estem a localhost, potser volem forçar un host diferent per provar
                            }
                        });


                        if (!response.ok) {
                            throw new Error('Tenant not found');
                        }

                        const tenantData = await response.json();
                        console.log('Tenant loaded:', tenantData);
                        setTenant(tenantData);
                    } catch (apiErr) {
                        console.error("Error fetching tenant:", apiErr);
                        // Fallback opcional per dev si l'API falla
                        if (import.meta.env.DEV) {
                            console.warn("API Error. Using Fallback for DEV mode.");
                            setTenant({
                                id: 'fallback-demo',
                                name: 'Demo Tenant (Fallback)',
                                slug: subdomain || 'demo',
                                primaryColor: '#3b82f6',
                                logoUrl: 'https://via.placeholder.com/150'
                            });
                        }
                    }
                } else {
                    console.log("No s'ha detectat cap subdomini específic.");
                }

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
