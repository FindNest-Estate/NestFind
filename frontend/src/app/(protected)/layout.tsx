/**
 * Protected Routes Layout
 * 
 * Server Component that enforces authentication and status checks.
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * RULES:
 * - Always fetch user status from backend
 * - Never trust cached role/status
 * - Redirect based on user status
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import AuthLoadingSpinner from '@/components/auth/AuthLoadingSpinner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UserResponse {
    id: string;
    full_name: string;
    email: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
    status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'IN_REVIEW' | 'DECLINED' | 'SUSPENDED';
}

/**
 * Server-side auth check
 */
async function getAuthUser(): Promise<UserResponse | null> {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Always fetch fresh - CRITICAL
        });

        if (!response.ok) {
            // Token invalid/expired
            return null;
        }

        return await response.json();
    } catch {
        // Do not log error object to avoid leaking sensitive data
        console.error('[ProtectedLayout] Auth check failed');
        return null;
    }
}

/**
 * Enforce user status redirects
 */
function enforceStatusRedirect(user: UserResponse): void {
    switch (user.status) {
        case 'PENDING_VERIFICATION':
            redirect('/verify-otp');
        case 'IN_REVIEW':
            redirect('/under-review');
        case 'DECLINED':
            redirect('/declined');
        case 'SUSPENDED':
            redirect('/suspended');
        case 'ACTIVE':
            // Continue to render children
            break;
        default:
            redirect('/login');
    }
}

export default async function ProtectedLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Show loading state while checking auth
    // Note: This is a Server Component, so this won't actually render
    // a loading spinner, but demonstrates the pattern for Client Components

    const user = await getAuthUser();

    // No user - redirect to login
    if (!user) {
        redirect('/login');
    }

    // Check status and redirect if not ACTIVE
    enforceStatusRedirect(user);

    // User is ACTIVE - render children with user context
    return (
        <div data-user-id={user.id} data-user-role={user.role}>
            {children}
        </div>
    );
}
