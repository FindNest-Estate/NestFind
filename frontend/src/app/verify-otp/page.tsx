'use client';

/**
 * OTP Verification Page
 * 
 * Based on:
 * - frontend/docs/auth_contract.md
 * - frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - OTP verification
 * - Lockout state with countdown
 * - Role-based redirect after verification
 * - Resend OTP functionality
 */

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOTP, generateOTP } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';

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

            // Redirect based on user type
            // Note: Backend sets status to ACTIVE (USER) or IN_REVIEW (AGENT)
            // We don't know which, so we redirect to login for USER flow
            // and let the auth guard handle IN_REVIEW redirect
            setSuccess('Email verified successfully! Redirecting...');

            setTimeout(() => {
                router.push('/login');
            }, 1500);

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">NestFind</h1>
                    <h2 className="mt-6 text-2xl font-semibold text-gray-700">
                        Verify Your Email
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        We've sent a verification code to
                    </p>
                    <p className="text-sm font-medium text-gray-900">{email}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {lockout.isLocked && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded">
                            <p className="font-semibold">Too many failed attempts</p>
                            <p className="text-sm mt-1">
                                Try again in {formatTime(lockout.remainingSeconds)}
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                            Verification Code
                        </label>
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
                            disabled={lockout.isLocked}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="000000"
                        />
                        <p className="mt-1 text-xs text-gray-500 text-center">
                            Enter the 6-digit code from your email
                        </p>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={lockout.isLocked || isSubmitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Verifying...' : lockout.isLocked ? 'Locked' : 'Verify Email'}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isResending || lockout.isLocked}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            {isResending ? 'Sending...' : 'Resend verification code'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-xs text-gray-500">
                    <p>Code expires in 10 minutes</p>
                </div>
            </div>
        </div>
    );
}
