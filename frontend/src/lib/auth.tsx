'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser } from '@/lib/authApi';
import { AuthUser, UserRole } from '@/lib/auth/types';
import Cookies from 'js-cookie';

// ============================================================================
// Token Management - Single Source of Truth
// ============================================================================

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACTIVE_CONTEXT_KEY = 'active_context';

/**
 * Get the current access token.
 * Reads from localStorage (primary), falls back to cookie.
 * If fallback is used, re-writes to localStorage for consistency.
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;

    const lsToken = localStorage.getItem(TOKEN_KEY);
    if (lsToken) return lsToken;

    const cookieToken = Cookies.get(TOKEN_KEY);
    if (cookieToken) {
        localStorage.setItem(TOKEN_KEY, cookieToken);
        return cookieToken;
    }

    return null;
}

function persistToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    Cookies.set(TOKEN_KEY, token, { expires: 1, path: '/' });
}

function persistRefreshToken(refreshToken: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    Cookies.remove(TOKEN_KEY, { path: '/' });
}

export function isAuthenticated(): boolean {
    return getToken() !== null;
}

// ============================================================================
// Auth Context
// ============================================================================

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    activeContext: UserRole | null;
    isLoading: boolean;
    login: (token: string, user: AuthUser, refreshToken?: string) => void;
    logout: () => void;
    switchContext: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const initialToken = getToken();

    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(initialToken);
    const [activeContext, setActiveContext] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(initialToken));

    // Initial session recovery when token exists
    useEffect(() => {
        if (!token) return;

        let cancelled = false;

        getCurrentUser()
            .then(userData => {
                if (cancelled) return;

                setUser(userData);

                const storedContext = localStorage.getItem(ACTIVE_CONTEXT_KEY) as UserRole;
                const validRoles = userData.roles || [userData.role];

                if (storedContext && validRoles.includes(storedContext)) {
                    setActiveContext(storedContext);
                } else {
                    let defaultContext = UserRole.BUYER;
                    if (validRoles.includes(UserRole.AGENT)) defaultContext = UserRole.AGENT;
                    else if (validRoles.includes(UserRole.SELLER)) defaultContext = UserRole.SELLER;
                    else if (validRoles.includes(UserRole.ADMIN)) defaultContext = UserRole.ADMIN;

                    setActiveContext(defaultContext);
                    localStorage.setItem(ACTIVE_CONTEXT_KEY, defaultContext);
                }
            })
            .catch(() => {
                if (cancelled) return;

                setToken(null);
                setUser(null);
                setActiveContext(null);
                clearTokens();
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const login = (newToken: string, newUser: AuthUser, refreshToken?: string) => {
        setToken(newToken);
        setUser(newUser);
        persistToken(newToken);
        if (refreshToken) {
            persistRefreshToken(refreshToken);
        }

        const validRoles = newUser.roles || [newUser.role];

        let initialContext = UserRole.BUYER;
        if (validRoles.includes(UserRole.AGENT)) initialContext = UserRole.AGENT;
        else if (validRoles.includes(UserRole.SELLER)) initialContext = UserRole.SELLER;
        else if (validRoles.includes(UserRole.ADMIN)) initialContext = UserRole.ADMIN;

        setActiveContext(initialContext);
        localStorage.setItem(ACTIVE_CONTEXT_KEY, initialContext);
        setIsLoading(false);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setActiveContext(null);
        clearTokens();
        localStorage.removeItem(ACTIVE_CONTEXT_KEY);
        window.location.href = '/login';
    };

    const switchContext = (newContext: UserRole) => {
        if (!user) return;

        const validRoles = user.roles || [user.role];

        if (!validRoles.includes(newContext) && newContext !== UserRole.ADMIN) {
            console.error(`Cannot switch to ${newContext}: User does not have this role.`);
            return;
        }

        setActiveContext(newContext);
        localStorage.setItem(ACTIVE_CONTEXT_KEY, newContext);
    };

    return (
        <AuthContext.Provider value={{ user, token, activeContext, isLoading, login, logout, switchContext }}>
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
