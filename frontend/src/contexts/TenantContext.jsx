// Importem eines de React que ens permetran crear estats i vigilar canvis globals.
import { createContext, useState, useEffect } from 'react';

/**
 * EL CONTEXT DEL LLOGATER (TenantContext)
 * ----------------------------------------------------------------------
 * El "Tenant" (o llogater) és la Protectora actual. Aquesta aplicació permet tenir diverses protectores
 * gestionades des del mateix codi base. Aquest context s'encarrega d'esbrinar a QUINA protectora
 * vol entrar el visitant ara mateix (segons la URL on es trobi) i guarda aquesta informació.
 */
const TenantContext = createContext();

export function TenantProvider({ children }) {
    // 1. ESTATS:
    // guardem tota la informació de la protectora activa.
    const [tenant, setTenant] = useState(null);
    // guardem l'estat de càrrega per ensenyar un "loading spinner" mentre ho mirem al servidor.
    const [loading, setLoading] = useState(true);
    // guardem qualsevol error que pugui haver succeït (ex: si escriuen malament l'enllaç de la protectora).
    const [error, setError] = useState(null);

    /**
     * EFECTE INICIAL: Detectar a quina protectora estem (Tenant Detection)
     * Això corre tan bon punt es carrega la pàgina.
     */
    useEffect(() => {
        const detectTenant = async () => {
            try {
                // 1. LLEGIR LA URL
                // Obtenim de quina direcció ve l'usuari (ex: protebcn.matchcota.com o localhost)
                const hostname = window.location.hostname;
                const parts = hostname.split('.');

                // A vegades, sobretot desenvolupant, és còmode forçar la protectora escrivint ".../?tenant=protebcn"
                const searchParams = new URLSearchParams(window.location.search);
                const tenantParam = searchParams.get('tenant');

                let subdomain = '';

                // 2. LÒGICA DE DETECCIÓ (Prioritats)
                if (tenantParam) {
                    // Opció A (Útil per Programar): Hem forçat quin tenant volem amb el paràmetre "?tenant=".
                    subdomain = tenantParam;
                } else if (parts.length > 2) {
                    // Opció B (Producció Real): Ex: "protectora-barcelona.matchcota.com". Agafem la primera part.
                    subdomain = parts[0];
                } else {
                    // Opció C (Reserva per Recàrregues): Si simplement entrem a 'localhost' 
                    // i recarreguem la pàgina de cop, el subdomini s'hauria perdut.
                    // Però potser prèviament algú havia forçat una protectora. 
                    // Consultem el sessionStorage (memòria de navegació mentre la pestanya estigui oberta)
                    subdomain = sessionStorage.getItem('matchcota_tenant_slug') || '';
                }

                /**
                 * CONCEPTE DUAL: Plataforma Central vs. Portal de Protectora.
                 * Si en aquest punt subdomain està buit, això significa que l'usuari està a la web 
                 * "General" o principal (landing page general) i no està visitant a cap protectora directament.
                 */

                if (subdomain) {
                    // Acabem de detectar que VOLEN veure una protectora. Anem al servidor a validar-la.
                    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
                    const response = await fetch(`${apiUrl}/tenants/current`, {
                        headers: {
                            'Content-Type': 'application/json',
                            // Enviem el subdomini detectat a la capçalera especial 'X-Tenant-Slug' perquè l'API darrere ens entengui
                            'X-Tenant-Slug': subdomain
                        }
                    });

                    if (!response.ok) {
                        // Si el backend respon error, probablement l'enllaç sigui d'una protectora esborrada o inexistent.
                        sessionStorage.removeItem('matchcota_tenant_slug');
                        throw new Error('No hem pogut trobar aquesta protectora.');
                    }

                    // Protectora trobada amb èxit! Guardem les dades oficials directament passades del backend.
                    const tenantData = await response.json();
                    setTenant(tenantData);

                    // Guardem a sessionStorage l'èxit per recordar a on érem si recarregar la pestanya.
                    sessionStorage.setItem('matchcota_tenant_slug', tenantData.slug);
                }

                // Si no hi ha 'subdomain', no fem res; 'tenant' es quedarà com null (mode plataforma principal).

            } catch (err) {
                // Captura per si l'API cau o no troba la protectora. Emmagatzemem l'error.
                setError(err.message);
            } finally {
                // Vagi bé o vagi malament, indiquem que el joc de comprovacions ha acabat.
                // A partir d'aquí la pàgina ja mostrarà el contingut.
                setLoading(false);
            }
        };

        detectTenant();
    }, []);

    // El proveïdor envolta qui ho requereixi, i "exporta publicament" per als components la info del tenant.
    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
}

export default TenantContext;
