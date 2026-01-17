'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser } from '@/lib/authApi';
import { AuthUser } from '@/lib/auth/types';
import Cookies from 'js-cookie';

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initialize from cookies/localStorage on mount
        const storedToken = Cookies.get('access_token');
        if (storedToken) {
            setToken(storedToken);
            // Verify/Fetch user details
            getCurrentUser()
                .then(userData => setUser(userData))
                .catch(() => {
                    // Token invalid or session expired
                    setToken(null);
                    setUser(null);
                    try {
                        Cookies.remove('access_token');
                    } catch (e) {
                        console.error("Failed to remove cookie", e);
                    }
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = (newToken: string, newUser: AuthUser) => {
        setToken(newToken);
        setUser(newUser);
        Cookies.set('access_token', newToken, { expires: 1 }); // 1 day
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        Cookies.remove('access_token');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
