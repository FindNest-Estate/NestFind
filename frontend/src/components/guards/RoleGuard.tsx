'use client';

/**
 * RoleGuard — Reusable role-based access control wrapper.
 * 
 * Reads user role from AuthContext and redirects unauthorized users.
 * Does NOT make any additional API calls — relies entirely on context.
 * 
 * Enhanced: Shows an optional activation prompt (e.g., "Become a Seller")
 * instead of silently redirecting, when the user is logged in but lacks the role.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth/types';
import BecomeSellerButton from '@/components/BecomeSellerButton';

interface RoleGuardProps {
    /** Roles allowed to view this content */
    allowedRoles: UserRole[];
    /** Content to render when role is authorized */
    children: React.ReactNode;
    /** Where to redirect unauthorized users. Default: /dashboard */
    fallbackUrl?: string;
    /**
     * If true, shows a "role activation" prompt instead of redirecting
     * when user is logged in but doesn't have the right role.
     * Useful for sell pages where buyers can activate SELLER role.
     */
    showActivationPrompt?: boolean;
}

export default function RoleGuard({
    allowedRoles,
    children,
    fallbackUrl = '/dashboard',
    showActivationPrompt = false,
}: RoleGuardProps) {
    const { user, isLoading, activeContext } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // STRICT CHECK: User must be logged in AND their current active context must match allowedRoles
    // This prevents a user from accessing Seller routes while in Buyer context
    const isAuthorized = user && activeContext && allowedRoles.includes(activeContext);

    // Check if user is logged in but missing the required role entirely (not just wrong context)
    const hasRoleButWrongContext = user && !isAuthorized &&
        user.roles?.some(r => allowedRoles.includes(r as UserRole));

    // User is logged in but doesn't have the role at all
    const isMissingRole = user && !isAuthorized && !hasRoleButWrongContext;

    useEffect(() => {
        // Only redirect once we know the user's role (not while loading)
        if (!isLoading && !isAuthorized) {
            // Don't redirect if we're showing the activation prompt
            if (showActivationPrompt && isMissingRole) return;
            // Don't redirect if user has the role but wrong context — they can switch
            if (hasRoleButWrongContext) return;

            router.replace(fallbackUrl);
        }
    }, [isLoading, isAuthorized, router, fallbackUrl, showActivationPrompt, isMissingRole, hasRoleButWrongContext]);

    // Show spinner while auth is loading or component is not mounted
    if (!isMounted || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF385C]"></div>
            </div>
        );
    }

    // Show activation prompt for logged-in users who don't have the required role
    if (showActivationPrompt && isMissingRole && allowedRoles.includes(UserRole.SELLER)) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                        Start Selling on NestFind
                    </h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Activate your seller account to list properties, manage offers,
                        and connect with verified buyers. You'll keep all your buyer capabilities too.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <BecomeSellerButton />
                        <Link
                            href="/properties"
                            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ← Back to browsing
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Don't render content if unauthorized (will redirect via useEffect)
    if (!isAuthorized) {
        return null;
    }

    return <>{children}</>;
}
