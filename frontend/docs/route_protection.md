# Next.js App Router Route Protection Strategy

## Overview

This document defines the **exact** route protection implementation for Next.js App Router that enforces backend-driven authentication with zero client-side role/status assumptions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
├─────────────────────────────────────────────────────────────┤
│  Middleware (Edge)                                           │
│  ├── Check for token cookie                                  │
│  ├── Redirect unauthenticated to /login                      │
│  └── Pass through to Server Component                        │
├─────────────────────────────────────────────────────────────┤
│  Server Component (Auth Guard)                               │
│  ├── Call backend /user/me                                   │
│  ├── Verify user.status from response                        │
│  ├── Redirect based on status                                │
│  └── Pass user data to page                                  │
├─────────────────────────────────────────────────────────────┤
│  Page Component                                              │
│  └── Render with verified user context                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Middleware (Edge Runtime)

**File:** `frontend/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/agent',
  '/admin',
  '/listings',
];

// Routes only for unauthenticated users
const authRoutes = [
  '/login',
  '/register',
  '/verify-otp',
];

// Public routes (no auth check)
const publicRoutes = [
  '/',
  '/properties',
  '/about',
  '/contact',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // Check if accessing protected route without token
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && token) {
    // Redirect authenticated users away from auth pages
    // Note: Actual status check happens in Server Component
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 2. Server-Side Auth Verification

**File:** `frontend/src/lib/auth.ts`

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type UserRole = 'USER' | 'AGENT' | 'ADMIN';
export type UserStatus = 
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'IN_REVIEW'
  | 'DECLINED'
  | 'SUSPENDED';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
}

/**
 * Server-side auth check. Calls backend to verify token and get current user status.
 * NEVER trusts local data for role/status.
 */
export async function getAuthState(): Promise<AuthState> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    return { authenticated: false, user: null };
  }

  try {
    const response = await fetch(`${API_BASE}/user/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Always fetch fresh
    });

    if (response.status === 401) {
      // Token expired - attempt refresh
      const refreshed = await attemptTokenRefresh();
      if (!refreshed) {
        return { authenticated: false, user: null };
      }
      // Retry with new token
      return getAuthState();
    }

    if (!response.ok) {
      return { authenticated: false, user: null };
    }

    const user = await response.json();
    return { authenticated: true, user };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Attempt to refresh access token using refresh token.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return false;

    // Note: In production, set cookies via Set-Cookie header from backend
    return true;
  } catch {
    return false;
  }
}

/**
 * Redirect based on user status. Call this in protected routes.
 */
export function enforceAuthState(user: AuthUser | null, requiredRole?: UserRole): void {
  if (!user) {
    redirect('/login');
  }

  // Status-based redirects (priority order)
  switch (user.status) {
    case 'SUSPENDED':
      redirect('/suspended');
    case 'DECLINED':
      redirect('/declined');
    case 'IN_REVIEW':
      redirect('/under-review');
    case 'PENDING_VERIFICATION':
      redirect('/verify-otp');
  }

  // Role-based access control
  if (requiredRole && user.role !== requiredRole) {
    // Admin can access everything
    if (user.role !== 'ADMIN') {
      redirect('/unauthorized');
    }
  }
}
```

---

## 3. Auth Guard Component

**File:** `frontend/src/components/auth/AuthGuard.tsx`

```typescript
import { getAuthState, enforceAuthState, UserRole } from '@/lib/auth';
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

/**
 * Server Component that enforces authentication and status checks.
 * Renders children only if user passes all checks.
 */
export default async function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user } = await getAuthState();
  
  // This will redirect if checks fail - never renders children for invalid states
  enforceAuthState(user, requiredRole);

  return <>{children}</>;
}
```

---

## 4. Route-Level Protection

### Protected Dashboard Layout

**File:** `frontend/src/app/(protected)/layout.tsx`

```typescript
import AuthGuard from '@/components/auth/AuthGuard';
import { getAuthState } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
```

### Agent-Specific Routes

**File:** `frontend/src/app/(protected)/agent/layout.tsx`

```typescript
import AuthGuard from '@/components/auth/AuthGuard';

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="AGENT">
      {children}
    </AuthGuard>
  );
}
```

### Admin-Specific Routes

**File:** `frontend/src/app/(protected)/admin/layout.tsx`

```typescript
import AuthGuard from '@/components/auth/AuthGuard';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="ADMIN">
      {children}
    </AuthGuard>
  );
}
```

---

## 5. Status-Specific Pages

### IN_REVIEW State Page

**File:** `frontend/src/app/under-review/page.tsx`

```typescript
import { getAuthState } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UnderReviewClient from './UnderReviewClient';

export default async function UnderReviewPage() {
  const { user } = await getAuthState();

  // If no user or not IN_REVIEW, redirect appropriately
  if (!user) redirect('/login');
  if (user.status === 'ACTIVE') redirect('/dashboard');
  if (user.status !== 'IN_REVIEW') redirect('/login');

  return <UnderReviewClient user={user} />;
}
```

**File:** `frontend/src/app/under-review/UnderReviewClient.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/lib/auth';

const POLL_INTERVAL = 30000; // 30 seconds

export default function UnderReviewClient({ user }: { user: AuthUser }) {
  const router = useRouter();

  useEffect(() => {
    const pollStatus = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.status === 'ACTIVE') {
          router.push('/agent/dashboard');
        } else if (data.status === 'DECLINED') {
          router.push('/declined');
        }
      } catch (error) {
        console.error('Status poll failed:', error);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollStatus);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Application Under Review</h1>
        <p className="text-gray-600 mb-6">
          Your agent application is being reviewed by our team.
          This usually takes 1-2 business days.
        </p>
        <p className="text-sm text-gray-500">
          You will be automatically redirected once approved.
        </p>
      </div>
    </div>
  );
}
```

### LOCKED State Handling

**File:** `frontend/src/app/login/LoginForm.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface LockoutState {
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingSeconds: number;
}

export default function LoginForm() {
  const [lockout, setLockout] = useState<LockoutState>({
    isLocked: false,
    lockedUntil: null,
    remainingSeconds: 0,
  });

  // Countdown timer effect
  useEffect(() => {
    if (!lockout.isLocked || lockout.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockout(prev => {
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          return { isLocked: false, lockedUntil: null, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: newRemaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockout.isLocked, lockout.remainingSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    // Handle lockout response
    if (data.locked_until) {
      const lockedUntil = new Date(data.locked_until);
      const now = new Date();
      const remainingSeconds = Math.max(0, Math.floor((lockedUntil.getTime() - now.getTime()) / 1000));
      
      setLockout({
        isLocked: true,
        lockedUntil,
        remainingSeconds,
      });
      return;
    }

    // Handle success/other errors...
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit}>
      {lockout.isLocked && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          Account locked. Try again in {formatTime(lockout.remainingSeconds)}
        </div>
      )}
      
      {/* Form fields */}
      
      <button 
        type="submit" 
        disabled={lockout.isLocked}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {lockout.isLocked ? 'Locked' : 'Login'}
      </button>
    </form>
  );
}
```

---

## 6. Token Expiry Handling

**File:** `frontend/src/lib/api-client.ts`

```typescript
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API client with automatic token refresh on 401.
 */
export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Send cookies
  });

  if (response.status === 401) {
    // Attempt refresh
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!refreshResponse.ok) {
      // Refresh failed - clear tokens and redirect to login
      // This happens server-side, so we redirect
      redirect('/login?session_expired=true');
    }

    // Retry original request
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
    });
  }

  if (response.status === 403) {
    // Forbidden - likely status change (suspended, etc.)
    // Force re-check auth state
    redirect('/dashboard'); // Will trigger auth guard
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  return response;
}
```

---

## 7. Route Map

| Path | Auth Required | Role Required | Status Check |
|------|--------------|---------------|--------------|
| `/` | No | - | - |
| `/login` | No (redirect if auth) | - | - |
| `/register/*` | No | - | - |
| `/verify-otp` | Partial (user_id in session) | - | PENDING only |
| `/dashboard` | Yes | Any | ACTIVE only |
| `/agent/*` | Yes | AGENT | ACTIVE only |
| `/admin/*` | Yes | ADMIN | ACTIVE only |
| `/under-review` | Yes | AGENT | IN_REVIEW only |
| `/declined` | Yes | AGENT | DECLINED only |
| `/suspended` | Yes | Any | SUSPENDED only |

---

## Critical Rules Summary

1. **Middleware:** Only checks token existence, NOT validity
2. **Server Components:** Call backend to verify status/role
3. **Never trust client:** All auth decisions from fresh API calls
4. **Redirect chain:** Status check → Role check → Page render
5. **Lockout:** Client-side countdown, server enforces limit
6. **Polling:** IN_REVIEW state polls every 30 seconds with timeout

