'use client';

/**
 * OTP Verification Page - Airbnb-Inspired Design
 * 
 * Calm, focused, and trustworthy authentication step.
 * Strictly visual refactor - Logic preserved from original file.
 */

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOTP, generateOTP, getCurrentUser } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';
import Link from 'next/link';

interface LockoutState {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingSeconds: number;
}

export default function VerifyOTPPage() {
    const router = useRouter();

    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [lockout, setLockout] = useState<LockoutState>({
        isLocked: false,
        lockedUntil: null,
        remainingSeconds: 0,
    });

    // Load email and user_id from sessionStorage
    useEffect(() => {
        const storedEmail = sessionStorage.getItem('pending_verification_email');
        const storedUserId = sessionStorage.getItem('pending_verification_user_id');

        if (storedEmail) setEmail(storedEmail);
        if (storedUserId) setUserId(storedUserId);

        // If no context, redirect to login
        if (!storedEmail && !storedUserId) {
            router.push('/login');
        }
    }, [router]);

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
        setSuccess('');

        if (!otp || !userId) {
            setError('Please enter the verification code');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await verifyOTP({ user_id: userId, otp });

            // Check for lockout
            if (response.locked_until) {
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

            // Check for error
            if (!response.success) {
                setError(response.error || 'Invalid OTP');
                return;
            }

            // Success - clear session storage
            sessionStorage.removeItem('pending_verification_email');
            sessionStorage.removeItem('pending_verification_user_id');

            setSuccess('Email verified successfully! Redirecting...');

            // Check user status from backend to redirect appropriately
            try {
                const user = await getCurrentUser();

                // Redirect based on actual status
                setTimeout(() => {
                    if (user.status === 'ACTIVE') {
                        // USER verified - redirect to login
                        router.push('/login');
                    } else if (user.status === 'IN_REVIEW') {
                        // AGENT verified - redirect to under-review
                        router.push('/under-review');
                    } else {
                        // Unexpected status - redirect to login
                        router.push('/login');
                    }
                }, 1500);
            } catch (statusErr) {
                // If status check fails, default to login
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            }

        } catch (err: any) {
            if (err instanceof RateLimitError) {
                setError('Too many requests. Please wait and try again.');
            } else {
                setError(err.message || 'Verification failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setSuccess('');

        if (!userId) {
            setError('Session expired. Please register again.');
            return;
        }

        setIsResending(true);

        try {
            await generateOTP({ user_id: userId });
            setSuccess('New verification code sent to your email');
        } catch (err: any) {
            if (err instanceof RateLimitError) {
                setError('Too many requests. Please wait and try again.');
            } else {
                setError('Failed to resend code. Please try again.');
            }
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="max-w-[420px] w-full">
                {/* Logo */}
                <div className="mb-10 text-center">
                    <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Verify your email
                    </h1>
                    <div className="text-gray-600 px-4 leading-relaxed">
                        <p>We've sent a 6-digit code to</p>
                        <p className="font-medium text-gray-900 mt-1">{email}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Status Messages */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3 animate-fadeIn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm flex items-start gap-3 animate-fadeIn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{success}</span>
                        </div>
                    )}

                    {lockout.isLocked && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-start gap-3 animate-fadeIn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                            </svg>
                            <span>Too many attempts. Try again in <span className="font-bold font-mono">{formatTime(lockout.remainingSeconds)}</span></span>
                        </div>
                    )}

                    {/* OTP Input */}
                    <div>
                        <input
                            id="otp"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            disabled={lockout.isLocked || isSubmitting}
                            autoComplete="one-time-code"
                            className="block w-full h-16 text-center text-3xl font-mono tracking-[0.5em] rounded-xl border border-gray-200 shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] focus:outline-none transition-all duration-200 ease-in-out placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400 group-hover:border-gray-400"
                            placeholder="000000"
                        />
                        <p className="mt-3 text-sm text-gray-500 text-center">
                            Enter the 6-digit code sent to your email
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <button
                            type="submit"
                            disabled={lockout.isLocked || isSubmitting}
                            className="group relative flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E61E4D] py-4 px-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </>
                            ) : lockout.isLocked ? (
                                'Account Locked'
                            ) : (
                                'Verify Email'
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isResending || lockout.isLocked}
                                className="text-sm font-semibold text-gray-900 hover:text-[#FF385C] transition duration-200 hover:underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:text-gray-400"
                            >
                                {isResending ? 'Sending code...' : "Didn't receive the code? Resend"}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Safe Mode Footer - Minimal */}
                <div className="mt-12 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium opacity-70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                        <span>Secure Verification</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
