'use client';

/**
 * Login Page - Airbnb-Inspired Design
 * 
 * Premium two-column layout with trust signals
 */

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

interface LockoutState {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingSeconds: number;
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    const isAdminLogin = returnUrl.includes('admin') || returnUrl.includes('Admin');
    const sessionExpired = searchParams.get('session_expired') === 'true';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await login({ email, password, portal: 'user' });

            // Check if response is error with lockout
            if ('locked_until' in response && response.locked_until) {
                const lockedUntil = new Date(response.locked_until);
                const now = new Date();
                const remainingSeconds = Math.max(
                    0,
                    Math.floor((lockedUntil.getTime() - now.getTime()) / 1000)
                );

                setLockout({
                    isLocked: true,
                    lockedUntil,
                    remainingSeconds,
                });
                setError(response.error || 'Account locked');
                return;
            }

            // Check for generic error
            if ('success' in response && !response.success) {
                const errorMessage = (response as any).message || response.error || 'Login failed';

                // Provide user-friendly error messages
                if (errorMessage.toLowerCase().includes('invalid credentials')) {
                    setError('Incorrect email or password. Please try again.');
                } else if (errorMessage.toLowerCase().includes('admin portal')) {
                    setError('Admins should use the Admin Portal to login.');
                } else {
                    setError(errorMessage);
                }
                return;
            }

            // Success - has access_token
            if ('access_token' in response) {
                // Tokens are set via HTTP-only cookies by backend
                // AND we store them in localStorage for fallback (especially for cross-origin PUT/POST)
                if (response.access_token) localStorage.setItem('access_token', response.access_token);
                if (response.refresh_token) localStorage.setItem('refresh_token', response.refresh_token);

                // Redirect based on user status ONLY
                // Role-based routing is handled by Server Component in protected layout
                if (response.user.status === 'ACTIVE') {
                    // Navigate to protected area - Server Component handles role routing
                    // If returnUrl is present (e.g. /admin), use it, otherwise default to dashboard
                    if (returnUrl && returnUrl !== '/dashboard' && !returnUrl.includes('/login')) {
                        router.push(returnUrl);
                    } else {
                        router.push('/dashboard');
                    }
                } else if (response.user.status === 'PENDING_VERIFICATION') {
                    router.push('/verify-otp');
                } else if (response.user.status === 'IN_REVIEW') {
                    router.push('/under-review');
                } else if (response.user.status === 'DECLINED') {
                    router.push('/declined');
                } else if (response.user.status === 'SUSPENDED') {
                    router.push('/suspended');
                }
            }
        } catch (err: any) {
            console.error('[LOGIN DEBUG] Caught error:', err);
            if (err instanceof RateLimitError) {
                setError('Too many requests. Please wait and try again.');
            } else if (err?.message) {
                setError(err.message);
            } else if (err?.data?.error) {
                setError(err.data.error);
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Hero Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')`,
                    }}
                >
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-16 text-white z-10">
                    <h2 className="text-5xl font-bold tracking-tight mb-6 drop-shadow-2xl leading-none">
                        Discover a place<br />you'll love to live.
                    </h2>
                    <p className="text-xl text-gray-100 drop-shadow-lg font-medium max-w-lg mb-8">
                        Join our community of verified buyers and trusted agents to find your dream home with confidence.
                    </p>
                    {/* Trust indicators */}
                    <div className="flex gap-6 text-sm font-semibold text-white/90">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Verified Listings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Bank-Grade Security</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
                <div className="mx-auto w-full max-w-sm lg:w-[420px]"> {/* Slightly wider for premium feel */}
                    <div className="mb-10">
                        {/* Mobile Logo */}
                        <div className="lg:hidden mb-10 text-center">
                            <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                        </div>

                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                            {isAdminLogin ? 'Admin Portal' : 'Welcome back'}
                        </h1>
                        <p className="text-base text-gray-600">
                            {isAdminLogin ? 'Secure access for administrators.' : 'Please enter your details to sign in.'}
                        </p>

                        {sessionExpired && (
                            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-start gap-3 animate-fadeIn">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600">
                                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Session expired. Please log in again.</span>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3 animate-fadeIn">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        {lockout.isLocked && (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-start gap-3 animate-fadeIn">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600">
                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                                </svg>
                                <span>Account locked. Try again in <span className="font-bold font-mono">{formatTime(lockout.remainingSeconds)}</span></span>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting || lockout.isLocked}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm font-medium text-[#FF385C] hover:text-[#E31C5F] transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={setPassword}
                                    disabled={isSubmitting || lockout.isLocked}
                                    className="h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || lockout.isLocked}
                                className="group relative flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E61E4D] py-4 px-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </div>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500 font-medium">New to NestFind?</span>
                            </div>
                        </div>

                        <div className="text-center">
                            {isAdminLogin ? (
                                <Link
                                    href="/login"
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    ← Back to Employee/User Login
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/register"
                                        className="inline-block text-base font-semibold text-gray-900 hover:text-[#FF385C] transition duration-200 hover:underline underline-offset-4"
                                    >
                                        Create an account
                                    </Link>
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <Link
                                            href="/admin-login"
                                            className="text-sm font-medium text-gray-500 hover:text-[#FF385C] transition-colors"
                                        >
                                            Login as Admin
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </form>

                    {/* Safe Mode Footer */}
                    <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                            </svg>
                            <span>Secure Connection • 256-bit Encryption</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <svg className="animate-spin h-8 w-8 text-[#FF385C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
