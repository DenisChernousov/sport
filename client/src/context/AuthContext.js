import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
const AuthContext = createContext(null);
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setIsLoading(false);
            return;
        }
        try {
            const me = await api.auth.me();
            setUser(me);
        }
        catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        loadUser();
    }, [loadUser]);
    useEffect(() => {
        const handleLogout = () => {
            setUser(null);
        };
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);
    const login = useCallback(async (loginValue, password) => {
        const res = await api.auth.login({ login: loginValue, password });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        setUser(res.user);
    }, []);
    const register = useCallback(async (username, email, password, referralCode) => {
        const res = await api.auth.register({ username, email, password, referralCode });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        setUser(res.user);
    }, []);
    const logout = useCallback(async () => {
        try {
            await api.auth.logout();
        }
        catch {
            // ignore
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    }, []);
    const updateUser = useCallback((data) => {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
    }, []);
    const refreshUser = useCallback(async () => {
        try {
            const me = await api.auth.me();
            setUser(me);
        }
        catch {
            // ignore
        }
    }, []);
    const value = useMemo(() => ({ user, isLoading, isAuthenticated: !!user, login, register, logout, updateUser, refreshUser }), [user, isLoading, login, register, logout, updateUser, refreshUser]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
