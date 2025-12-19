'use client';

/**
 * Login Page
 * 
 * Based on:
 * - frontend/docs/auth_contract.md
 * - frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - Email/password login
 * - Lockout state with countdown
 * - Success redirect to dashboard
 */

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';

interface LockoutState {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingSeconds: number;
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
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
            const response = await login({ email, password });

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
                setError(response.error || 'Login failed');
                return;
            }

            // Success - has access_token
            if ('access_token' in response) {
                // Tokens are set via HTTP-only cookies by backend
                // Redirect based on user status
                if (response.user.status === 'ACTIVE') {
                    router.push(returnUrl);
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
            if (err instanceof RateLimitError) {
                setError('Too many requests. Please wait and try again.');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">NestFind</h1>
                    <h2 className="mt-6 text-2xl font-semibold text-gray-700">
                        Sign in to your account
                    </h2>
                    {sessionExpired && (
                        <p className="mt-2 text-sm text-amber-600">
                            Your session has expired. Please sign in again.
                        </p>
                    )}
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {lockout.isLocked && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded">
                            <p className="font-semibold">Account temporarily locked</p>
                            <p className="text-sm mt-1">
                                Try again in {formatTime(lockout.remainingSeconds)}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={lockout.isLocked}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={lockout.isLocked}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={lockout.isLocked || isSubmitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Signing in...' : lockout.isLocked ? 'Locked' : 'Sign in'}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-gray-600">Don't have an account? </span>
                        <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-500">
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
