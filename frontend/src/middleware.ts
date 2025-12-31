/**
 * Next.js Middleware for Route Protection
 * 
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * RULES:
 * - Middleware only checks token existence (fast, edge runtime)
 * - Server Components verify actual status/role from backend
 * - No client-side hacks
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// Route Definitions
// ============================================================================

// Public routes - no auth required
const PUBLIC_ROUTES = [
    '/',
    '/properties',
    '/about',
    '/contact',
    '/find-agent',
    '/agents',
];

// Auth routes - unauthenticated only
const AUTH_ROUTES = [
    '/login',
    '/register',
];

// Status-specific routes - handled separately
const STATUS_ROUTES = [
    '/verify-otp',
    '/under-review',
    '/declined',
    '/suspended',
];

// Static assets and API routes to skip
const SKIP_PATTERNS = [
    '/_next',
    '/api',
    '/favicon.ico',
    '/public',
];

// ============================================================================
// Helpers
// ============================================================================

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
}

function isStatusRoute(pathname: string): boolean {
    return STATUS_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );
}

function shouldSkip(pathname: string): boolean {
    return SKIP_PATTERNS.some(pattern => pathname.startsWith(pattern)) ||
        !!pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/);
}

// ============================================================================
// Middleware
// ============================================================================

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets and API routes
    if (shouldSkip(pathname)) {
        return NextResponse.next();
    }

    // Get access token from cookie
    const accessToken = request.cookies.get('access_token')?.value;
    const hasToken = Boolean(accessToken);

    // Public routes - always allow
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // Status routes - allow (actual status check happens in Server Component)
    if (isStatusRoute(pathname)) {
        return NextResponse.next();
    }

    // Auth routes (login/register) - redirect to dashboard if already authenticated
    if (isAuthRoute(pathname)) {
        if (hasToken) {
            // Has token - redirect to dashboard
            // Note: If token is expired/invalid, Server Component will handle it
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // Protected routes - redirect to login if no token
    if (!hasToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Has token - allow (Server Component will verify status/role)
    return NextResponse.next();
}

// ============================================================================
// Matcher Configuration
// ============================================================================

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
