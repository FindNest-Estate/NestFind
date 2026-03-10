/**
 * Dashboard Router Page - Client Component
 * 
 * Redirects users to their role-specific landing page.
 * Uses client-side auth to avoid cross-origin cookie issues.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth/types';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
    status: string;
}

/**
 * Role-specific home pages
 */
const ROLE_HOME_PAGES: Record<string, string> = {
    [UserRole.BUYER]: '/properties',      // Buyers go to properties (home)
    [UserRole.SELLER]: '/sell/dashboard', // Sellers go to dashboard
    [UserRole.AGENT]: '/agent/dashboard', // Agents go to dashboard
    [UserRole.ADMIN]: '/admin',           // Admins go to admin panel
};

export default function DashboardRouterPage() {
    const router = useRouter();
    const { user, activeContext, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        // Use activeContext if available, otherwise fallback to primary role
        const contextToUse = activeContext || user.role;
        const targetPage = ROLE_HOME_PAGES[contextToUse] || '/';

        router.replace(targetPage);
    }, [user, activeContext, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
                    <p className="text-gray-500">Redirecting...</p>
                </div>
            </div>
        );
    }

    return null;
}
