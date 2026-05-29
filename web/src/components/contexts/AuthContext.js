import React, { createContext, useState } from 'react';
import jwtDecode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Synchronously initialize state from localStorage to prevent race conditions during routing
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decoded = jwtDecode(storedToken);
                return { sub: decoded.id, name: decoded.name || 'System Admin' };
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [userRoles, setUserRoles] = useState(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decoded = jwtDecode(storedToken);
                return [decoded.role];
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        const decoded = jwtDecode(newToken);
        setUser({ sub: decoded.id, name: decoded.name || 'System Admin' });
        setUserRoles([decoded.role]);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setUserRoles([]);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, userRoles, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};