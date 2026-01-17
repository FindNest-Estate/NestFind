/**
 * Protected Routes Layout - Client Component Version
 * 
 * Due to cross-origin cookie issues between frontend (3000) and backend (8000),
 * we use client-side auth checking with localStorage tokens.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/authApi';
import NotificationsProvider from '@/components/providers/NotificationsProvider';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
    status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'IN_REVIEW' | 'DECLINED' | 'SUSPENDED';
}

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            console.log('[ProtectedLayout] Starting auth check...');
            console.log('[ProtectedLayout] Token:', localStorage.getItem('access_token') ? 'EXISTS' : 'MISSING');
            try {
                const userData = await getCurrentUser();

                // Check status
                switch (userData.status) {
                    case 'PENDING_VERIFICATION':
                        router.replace('/verify-otp');
                        return;
                    case 'IN_REVIEW':
                        router.replace('/under-review');
                        return;
                    case 'DECLINED':
                        router.replace('/declined');
                        return;
                    case 'SUSPENDED':
                        router.replace('/suspended');
                        return;
                    case 'ACTIVE':
                        // Good to go
                        break;
                    default:
                        router.replace('/login');
                        return;
                }

                setUser(userData);
            } catch (error) {
                console.error('[ProtectedLayout] Auth check failed:', error);
                router.replace('/login?session_expired=true');
            } finally {
                setIsLoading(false);
            }
        }

        checkAuth();
    }, [router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF385C]"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div data-user-id={user.id} data-user-role={user.role}>
            <NotificationsProvider />
            {children}
        </div>
    );
}
