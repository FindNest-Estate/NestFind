/**
 * Frontend Authentication Route Guards
 * 
 * Based on:
 * - frontend/docs/route_protection.md
 * - frontend/docs/auth_state_machine.md
 * 
 * These guards enforce route protection without making assumptions.
 */

import { AuthState, UserRole, UserStatus } from './types';

// ============================================================================
// Route Definitions
// ============================================================================

const PUBLIC_ROUTES = [
    '/',
    '/properties',
    '/about',
    '/contact',
    '/agents',
];

const AUTH_ROUTES = [
    '/login',
    '/register',
    '/register/user',
    '/register/agent',
];

const PROTECTED_ROUTES = [
    '/dashboard',
    '/profile',
    '/listings',
];

const AGENT_ROUTES = [
    '/agent',
    '/agent/dashboard',
    '/agent/listings',
    '/agent/clients',
];

const ADMIN_ROUTES = [
    '/admin',
    '/admin/agents',
    '/admin/users',
];

const STATUS_ROUTES = [
    '/verify-otp',
    '/under-review',
    '/declined',
    '/suspended',
];

// ============================================================================
// Route Check Functions
// ============================================================================

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some(route =>
        path === route || path.startsWith(`${route}/`)
    );
}

/**
 * Check if a route is an auth route (login/register - unauthenticated only)
 */
export function isAuthRoute(path: string): boolean {
    return AUTH_ROUTES.some(route =>
        path === route || path.startsWith(`${route}/`)
    );
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(path: string): boolean {
    // Not public and not an auth route = requires auth
    return !isPublicRoute(path) && !isAuthRoute(path);
}

/**
 * Check if a route requires USER role
 */
export function requiresUserRole(path: string): boolean {
    // Currently, no USER-specific routes (dashboard is for all ACTIVE users)
    return false;
}

/**
 * Check if a route requires AGENT role
 */
export function requiresAgentRole(path: string): boolean {
    return AGENT_ROUTES.some(route =>
        path === route || path.startsWith(`${route}/`)
    );
}

/**
 * Check if a route requires ADMIN role
 */
export function requiresAdminRole(path: string): boolean {
    return ADMIN_ROUTES.some(route =>
        path === route || path.startsWith(`${route}/`)
    );
}

/**
 * Get required role for a route, if any
 */
export function getRequiredRole(path: string): UserRole | null {
    if (requiresAdminRole(path)) return UserRole.ADMIN;
    if (requiresAgentRole(path)) return UserRole.AGENT;
    if (requiresUserRole(path)) return UserRole.USER;
    return null;
}

// ============================================================================
// State-Based Route Access
// ============================================================================

/**
 * Check if a user in a given AuthState can access a route
 * 
 * Returns: { allowed: boolean; redirectTo?: string }
 */
export function isAllowedRoute(
    state: AuthState,
    path: string,
    userRole?: UserRole
): { allowed: boolean; redirectTo?: string } {
    // Public routes always allowed
    if (isPublicRoute(path)) {
        return { allowed: true };
    }

    // Auth routes (login/register) - only for unauthenticated
    if (isAuthRoute(path)) {
        if (state === AuthState.UNAUTHENTICATED || state === AuthState.LOCKED) {
            return { allowed: true };
        }
        // Redirect authenticated users away from auth pages
        return { allowed: false, redirectTo: '/dashboard' };
    }

    // Status-specific routes
    if (path === '/verify-otp') {
        if (state === AuthState.OTP_REQUIRED) {
            return { allowed: true };
        }
        return { allowed: false, redirectTo: state === AuthState.UNAUTHENTICATED ? '/login' : '/dashboard' };
    }

    if (path === '/under-review') {
        if (state === AuthState.IN_REVIEW) {
            return { allowed: true };
        }
        return { allowed: false, redirectTo: state === AuthState.AUTHENTICATED ? '/dashboard' : '/login' };
    }

    if (path === '/declined') {
        if (state === AuthState.DECLINED) {
            return { allowed: true };
        }
        return { allowed: false, redirectTo: '/login' };
    }

    if (path === '/suspended') {
        if (state === AuthState.SUSPENDED) {
            return { allowed: true };
        }
        return { allowed: false, redirectTo: '/login' };
    }

    // Protected routes require AUTHENTICATED state
    if (requiresAuth(path)) {
        // Not authenticated at all
        if (state === AuthState.UNAUTHENTICATED) {
            return { allowed: false, redirectTo: '/login' };
        }

        // Wrong status - redirect to status page
        if (state === AuthState.OTP_REQUIRED) {
            return { allowed: false, redirectTo: '/verify-otp' };
        }
        if (state === AuthState.IN_REVIEW) {
            return { allowed: false, redirectTo: '/under-review' };
        }
        if (state === AuthState.DECLINED) {
            return { allowed: false, redirectTo: '/declined' };
        }
        if (state === AuthState.SUSPENDED) {
            return { allowed: false, redirectTo: '/suspended' };
        }
        if (state === AuthState.LOCKED) {
            return { allowed: false, redirectTo: '/login' };
        }

        // User is AUTHENTICATED - check role-based access
        if (state === AuthState.AUTHENTICATED) {
            const requiredRole = getRequiredRole(path);

            if (requiredRole && userRole) {
                // Admin can access everything
                if (userRole === UserRole.ADMIN) {
                    return { allowed: true };
                }

                // Otherwise, exact role match required
                if (userRole !== requiredRole) {
                    return { allowed: false, redirectTo: '/unauthorized' };
                }
            }

            return { allowed: true };
        }
    }

    // Default: allow
    return { allowed: true };
}

// ============================================================================
// Redirect Helpers
// ============================================================================

/**
 * Get redirect path for a given user status
 */
export function getStatusRedirect(status: UserStatus): string | null {
    switch (status) {
        case UserStatus.PENDING_VERIFICATION:
            return '/verify-otp';
        case UserStatus.IN_REVIEW:
            return '/under-review';
        case UserStatus.DECLINED:
            return '/declined';
        case UserStatus.SUSPENDED:
            return '/suspended';
        case UserStatus.ACTIVE:
            return null; // No redirect needed
        default:
            return '/login';
    }
}

/**
 * Get the appropriate dashboard path for a user role
 */
export function getDashboardPath(role: UserRole): string {
    switch (role) {
        case UserRole.ADMIN:
            return '/admin/dashboard';
        case UserRole.AGENT:
            return '/agent/dashboard';
        case UserRole.USER:
            return '/dashboard';
        default:
            return '/dashboard';
    }
}
