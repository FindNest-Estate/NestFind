/**
 * Dashboard Router Page - Client Component
 * 
 * Redirects users to their role-specific landing page.
 * Uses client-side auth to avoid cross-origin cookie issues.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/authApi';

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
const ROLE_HOME_PAGES: Record<User['role'], string> = {
    USER: '/',  // Users (buyers/sellers) go to landing page
    AGENT: '/agent/dashboard',
    ADMIN: '/admin',
};

export default function DashboardRouterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function redirectToRoleHome() {
            try {
                const user = await getCurrentUser();
                const targetPage = ROLE_HOME_PAGES[user.role] || '/';
                router.replace(targetPage);
            } catch (error) {
                console.error('[DashboardRouter] Auth check failed:', error);
                router.replace('/login');
            } finally {
                setIsLoading(false);
            }
        }

        redirectToRoleHome();
    }, [router]);

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
