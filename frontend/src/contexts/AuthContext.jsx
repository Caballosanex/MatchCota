import { createContext, useState, useEffect, useContext } from 'react';
import TenantContext from './TenantContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { tenant } = useContext(TenantContext);

    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const tenantSlug = tenant?.slug || 'demo';

        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        formData.append('client_id', tenantSlug);

        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Tenant-Slug': tenantSlug,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Login failed');
        }

        const data = await response.json();
        const token = data.access_token;

        // Obtenir info completa del usuari via /auth/me
        const meResponse = await fetch(`${baseUrl}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Slug': tenantSlug,
            },
        });

        let userData;
        if (meResponse.ok) {
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
            userData = { email, name: email, token };
        }

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
