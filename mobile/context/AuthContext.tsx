import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

type AuthType = {
    user: any | null;
    token: string | null;
    signIn: (token: string, user: any) => void;
    signOut: () => void;
    isLoading: boolean;
};

const AuthContext = createContext<AuthType>({
    user: null,
    token: null,
    signIn: () => { },
    signOut: () => { },
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('auth_token');
                const storedUser = await SecureStore.getItemAsync('auth_user');

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load session', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadSession();
    }, []);

    // Protected Route Logic
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!token && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/(auth)/login');
        } else if (token && inAuthGroup) {
            // Redirect to home if authenticated
            router.replace('/');
        }
    }, [token, segments, isLoading]);

    const signIn = async (newToken: string, newUser: any) => {
        setToken(newToken);
        setUser(newUser);
        await SecureStore.setItemAsync('auth_token', newToken);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(newUser));
    };

    const signOut = async () => {
        setToken(null);
        setUser(null);
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('auth_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, signIn, signOut, isLoading }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}
