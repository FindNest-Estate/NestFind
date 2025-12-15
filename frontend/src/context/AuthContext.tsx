"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: "buyer" | "agent" | "admin" | "super_admin";
    agency_name?: string;
    phone?: string;
    bio?: string;
    license_number?: string;
    experience_years?: number;
    avatar_url?: string;
    social_links?: {
        linkedin?: string;
        twitter?: string;
        instagram?: string;
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    console.log("AuthContext: Fetching user with token...");
                    const userData = await api.auth.me();
                    console.log("AuthContext: Fetched user:", userData);
                    setUser(userData);
                } catch (error) {
                    console.error("AuthContext: Failed to fetch user", error);
                    localStorage.removeItem("token");
                    setUser(null);
                }
            } else {
                console.log("AuthContext: No token found");
                setUser(null);
            }
            setIsLoading(false);
        };

        initAuth();

        // Listen for token changes across tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "token") {
                console.log("AuthContext: Token changed in another tab, reloading...");
                window.location.reload();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const login = async (token: string, shouldRedirect: boolean = true) => {
        localStorage.setItem("token", token);
        const userData = await api.auth.me();
        setUser(userData);
        if (shouldRedirect) {
            if (userData.role === 'agent' || userData.role === 'admin') {
                router.push("/dashboard");
            } else {
                router.push("/");
            }
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        router.push("/login");
    };

    const refreshUser = async () => {
        try {
            const userData = await api.auth.me();
            setUser(userData);
        } catch (error) {
            console.error("AuthContext: Failed to refresh user", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
