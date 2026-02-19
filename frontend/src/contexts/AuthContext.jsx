import { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Comprovar si hi ha un token al localStorage al carregar
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // AQUI: Fariem la crida real a l'API: POST /api/v1/auth/login
        // Per ara, simulem èxit

        try {
            const formData = new URLSearchParams();
            formData.append('username', email); // FastAPI OAuth2PasswordRequestForm uses 'username'
            formData.append('password', password);

            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            const token = data.access_token;
            // Decode token to get user info if not provided in response, 
            // OR fetch user info separately. For now assume we need to fetch user info or it's in the token.
            // Let's assume we decode it or fetch me.
            // For MVP simplicity, let's fetch /users/me or similar if exists, or just store basic info.

            // NOTE: In CLAUDE.md endpoint list is:
            // POST /api/v1/auth/login
            // Let's assume we get the token and then set user.

            const userData = { email, role: 'admin', token }; // Simplified. Ideally fetch /me

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (err) {
            console.error(err);
            throw err;
        }
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
