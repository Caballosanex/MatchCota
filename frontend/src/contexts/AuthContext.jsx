// Importem eines fonamentals de React:
// - createContext: Ens permet crear un "magatzem global" de dades.
// - useState: Per guardar informació que canvia en el temps (ex: l'usuari actual).
// - useEffect: Per executar codi quan el component neix (ex: mirar si ja estàvem loguejats).
// - useContext: Per poder llegir dades d'un altre "magatzem" (en aquest cas, de la protectora activa).
import { createContext, useState, useEffect, useContext } from 'react';
import TenantContext from './TenantContext';
import { getApiBaseUrl } from '../api/baseUrl';

/**
 * EL CONTEXT D'AUTENTICACIÓ
 * ----------------------------------------------------------------------
 * Qué és un "Context" en React?
 * Imagina que la informació de si un usuari ha fet login és necessària en desenes d'arxius diferents (la cabecera, els panells, etc.).
 * En lloc d'anar passant aquesta informació d'arxiu en arxiu manualment (el que s'anomena "prop drilling"),
 * el Context posa aquesta informació al "núvol" de la teva aplicació. Qualsevol component pot mirar cap amunt i llegir-la directament.
 */
const AuthContext = createContext();

/**
 * COMPONENTE PROVEÏDOR (AuthProvider)
 * Aquest component envolta tota la nostra aplicació (es fa normalment a main.jsx o App.jsx)
 * i s'encarrega de "proveir" les dades d'autenticació a la resta de components.
 */
export function AuthProvider({ children }) {
    // 1. ESTATS GLOBLAS
    // Guardem l'usuari (si és null vol dir que no ha fet login)
    const [user, setUser] = useState(null);
    // Guardem si estem comprovant el login inicial. Comencem en true perquè fins
    // que mirem el LocalStorage no sabem si està loguejat o no.
    const [loading, setLoading] = useState(true);

    // Llegim del magatzem de Protectores (TenantContext) a quina protectora estem intentant entrar.
    const { tenant } = useContext(TenantContext);

    // Definim la ruta base de la nostra API on enviem les peticions
    const baseUrl = getApiBaseUrl();

    /**
     * EFECTE D'INICI (useEffect)
     * Aquest bloc s'executa UNA SOLA VEGADA quan s'obre la web.
     * Propòsit: Mirar si l'usuari ja s'havia loguejat en el passat i guardat la seva sessió al navegador.
     */
    useEffect(() => {
        // Mirem a la memòria del navegador (LocalStorage)
        const token = localStorage.getItem('token'); // El "passaport" secret
        const savedUser = localStorage.getItem('user'); // Les dades de l'usuari (nom, email...)

        if (token && savedUser) {
            try {
                // Com que guardem les dades com a text (String), hem de convertir-les de nou a un objecte JavaScript amb JSON.parse
                setUser(JSON.parse(savedUser));
            } catch {
                // Si per algun error les dades estaven malmeses, per seguretat netegem la memòria.
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        // Un cop hem mirat, diem que ja hem acabat de carregar la informació inicial.
        setLoading(false);
    }, []);

    /**
     * FUNCIÓ LOGIN
     * Aquesta és la funció que cridarem des del formulari de Login quan l'usuari cliqui "Entrar".
     */
    const login = async (email, password) => {
        // Necessitem saber per quina protectora s'està loguejant
        const tenantSlug = tenant?.slug;

        if (!tenantSlug) {
            // Un error per nosaltres, per avisar si hem intentat loguejar d'una protectora que no existeix
            throw new Error('No hi ha protectora seleccionada. Has de navegar primer a la protectora adient.');
        }

        // Preparem les dades exactament com a les espera el backend (formulari d'escriptura URL)
        const formData = new URLSearchParams();
        formData.append('username', email); // Al backend el camp es diu username encara que passem un email
        formData.append('password', password);
        formData.append('client_id', tenantSlug);

        // PAS 1: Cridem a l'API per comprovar l'usuari i la contrasenya
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Tenant-Slug': tenantSlug, // Li diem al backend a quina base de dades ha de mirar
            },
            body: formData,
        });

        // Si l'API diu que la contrasenya és dolenta o passa alguna cosa...
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error en iniciar la sessió');
        }

        // Si anem bé, extraiem el token (el "passaport") de la resposta
        const data = await response.json();
        const token = data.access_token;

        // PAS 2: Ara que tenim el token, li demanem al backend que ens doni tota la informació 
        // detallada d'aquest usuari en concret (nom real, rol, etc.)
        const meResponse = await fetch(`${baseUrl}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`, // Presentem el passaport!
                'X-Tenant-Slug': tenantSlug,
            },
        });

        let userData;
        if (meResponse.ok) {
            // Si funciona, l'API ens tornarà la nostra fitxa completa
            const meData = await meResponse.json();
            userData = {
                id: meData.id,
                email: meData.email,
                username: meData.username,
                name: meData.name || meData.username,
                tenant_id: meData.tenant_id,
                token,
            };
        } else {
            // Com a salvavides d'emergència si falla obtenir el perfil guardem dades bàsiques
            userData = { email, name: email, token };
        }

        // PAS 3: Guardem-ho tot! Ho guardem al LocalStorage perquè si tanquem i obrim el Chrome, no perdem la sessió.
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        // I actualitzem l'estat de React perquè les pantalles sàpiguen que ja estem a dins
        setUser(userData);

        return userData; // Retornem les dades per si les vol utilitzar qui va cridar la funció
    };

    /**
     * FUNCIÓ LOGOUT (Tancar Sessió)
     * És molt simple: Esborrem "l'usuari" de la memòria del navegador i de l'estat de React.
     */
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        // Aquest Proveïdor embolica "children" (els altres components)
        // L'atribut 'value' conté les caixes fortes clau que tots els components podran utilitzar a gust:
        // Qui és l'usuari, el botó de login, el de logout i si estem "carregant".
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
