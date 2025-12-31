/**
 * Dashboard Router Page
 * 
 * Server Component that redirects users to their role-specific landing page.
 * This maintains backend-authoritative architecture by:
 * - Fetching fresh user data from /user/me (cache: 'no-store')
 * - Redirecting based on role from backend response
 * - Never caching or storing role client-side
 * 
 * Redirects:
 * - USER → / (landing page for buyers/sellers)
 * - AGENT → /agent/dashboard
 * - ADMIN → /admin
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UserResponse {
    id: string;
    full_name: string;
    email: string;
    role: 'USER' | 'AGENT' | 'ADMIN';
    status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'IN_REVIEW' | 'DECLINED' | 'SUSPENDED';
}

/**
 * Server-side auth check with fresh data
 */
async function getAuthUser(): Promise<UserResponse | null> {
    const cookieStore = await cookies();
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
            cache: 'no-store', // CRITICAL: Always fetch fresh
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        console.error('[DashboardRouter] Auth check failed');
        return null;
    }
}

/**
 * Role-specific home pages
 */
const ROLE_HOME_PAGES: Record<UserResponse['role'], string> = {
    USER: '/',  // Users (buyers/sellers) go to landing page
    AGENT: '/agent/dashboard',
    ADMIN: '/admin',
};

export default async function DashboardRouterPage() {
    const user = await getAuthUser();

    // No user - redirect to login (shouldn't happen due to layout check, but safety first)
    if (!user) {
        redirect('/login');
    }

    // User status is already verified by parent layout
    // Redirect based on role from fresh backend response
    const targetPage = ROLE_HOME_PAGES[user.role];
    redirect(targetPage);
}
