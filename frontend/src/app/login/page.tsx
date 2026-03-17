'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login as loginApi } from '@/lib/authApi';
import { useAuth } from '@/lib/auth';
import { RateLimitError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';
import {
    ShieldCheck,
    Lock,
    X,
    ArrowRight
} from 'lucide-react';

interface LockoutState {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingSeconds: number;
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin } = useAuth();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    const isAdminLogin = returnUrl.includes('admin') || returnUrl.includes('Admin');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lockout, setLockout] = useState<LockoutState>({
        isLocked: false,
        lockedUntil: null,
        remainingSeconds: 0,
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
            const response = await loginApi({ email, password, portal: 'user' });

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

            if ('success' in response && !response.success) {
                const errorMessage = (response as any).message || response.error || 'Login failed';
                if (errorMessage.toLowerCase().includes('invalid credentials')) {
                    setError('Incorrect email or password. Please try again.');
                } else if (errorMessage.toLowerCase().includes('admin portal')) {
                    setError('Admins should use the Admin Portal to login.');
                } else {
                    setError(errorMessage);
                }
                return;
            }

            if ('access_token' in response) {
                authLogin(response.access_token, response.user, response.refresh_token);

                if (response.user.status === 'ACTIVE') {
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
        <div className="h-screen w-full flex bg-white overflow-hidden">
            {/* Left Side: Image Showcase */}
            <div className="hidden md:flex w-1/2 relative bg-gray-900 isolation-auto">
                <img 
                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="Premium Real Estate Showcase"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'} z-0`}
                />
                
                {/* Heavy dark overlay to ensure text readability */}
                <div className="absolute inset-0 bg-gray-950/60 z-10" />
                
                <div className={`absolute inset-0 z-20 w-full h-full flex flex-col justify-end p-12 lg:p-20 text-white transition-all duration-1000 delay-300 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <h2 style={{ color: 'white', textShadow: '0 4px 8px rgba(0,0,0,0.5)' }} className="text-4xl xl:text-5xl font-bold tracking-tight mb-6 select-none leading-tight">
                        Find your place in the world.
                    </h2>
                    <div className="w-12 h-1 bg-[#FF385C] mb-6 shadow-sm" />
                    <p style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }} className="text-lg lg:text-xl font-medium max-w-lg leading-relaxed select-none">
                        "NestFind transformed how we approach real estate. The platform's clarity and focus on quality made finding our dream home a seamless experience."
                    </p>
                </div>
            </div>

            {/* Right Side: Simple Auth Form */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center relative p-8 sm:p-12 xl:p-24 h-full">
                
                {/* Brand Logo - Top Left */}
                <div className="absolute top-8 left-8 sm:top-12 sm:left-12 md:hidden">
                    <Link href="/" className="inline-block">
                        <span className="text-2xl font-black text-[#FF385C] tracking-tight hover:text-gray-900 transition-colors duration-300">NestFind</span>
                    </Link>
                </div>
                <div className="absolute top-8 left-8 lg:top-12 lg:left-12 hidden md:block">
                    <Link href="/" className="inline-block">
                        <span className="text-3xl font-black text-[#FF385C] tracking-tight hover:text-gray-900 transition-colors duration-300">NestFind</span>
                    </Link>
                </div>

                <div className={`w-full max-w-md transition-all duration-700 ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    
                    <div className="mb-10 lg:mb-12 mt-8 lg:mt-0">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {isAdminLogin ? 'Admin Sign In' : 'Welcome back'}
                        </h1>
                        <p className="text-gray-500 text-base">
                            {isAdminLogin ? 'Please enter your credentials to access the admin portal.' : 'Please enter your details to access your account.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                                <span className="text-sm font-medium text-red-700">{error}</span>
                            </div>
                        )}

                        {lockout.isLocked && (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                                <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                                <span className="text-sm font-medium text-amber-800">
                                    Account locked. Try again in <span className="font-bold ml-1">{formatTime(lockout.remainingSeconds)}</span>
                                </span>
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
                                    className="block w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:border-[#FF385C] focus:ring-1 focus:ring-[#FF385C] outline-none transition-shadow sm:text-base placeholder-gray-400"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting || lockout.isLocked}
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    <Link href="/forgot-password" className="text-sm font-medium text-[#FF385C] hover:text-[#E31C5F] transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={setPassword}
                                    disabled={isSubmitting || lockout.isLocked}
                                    placeholder="Enter your password"
                                    className="block w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:border-[#FF385C] focus:ring-1 focus:ring-[#FF385C] outline-none transition-shadow sm:text-base placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || lockout.isLocked}
                            className="w-full flex justify-center items-center gap-2 h-12 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-[#FF385C] hover:bg-[#E61E4D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF385C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 text-center space-y-4">
                        {!isAdminLogin && (
                            <p className="text-sm font-medium text-gray-600">
                                Don't have an account?{' '}
                                <Link href="/register" className="text-[#FF385C] font-semibold hover:text-[#E61E4D] transition-colors hover:underline underline-offset-4">
                                    Sign up
                                </Link>
                            </p>
                        )}

                        <div className="pt-6 border-t border-gray-100">
                            {isAdminLogin ? (
                                <Link href="/login" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                                    Return to Standard Login
                                </Link>
                            ) : (
                                <Link href="/admin-login" className="text-xs font-semibold text-gray-500 hover:text-[#FF385C] transition-colors flex items-center justify-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4" />
                                    Admin Portal
                                </Link>
                            )}
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
                <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#FF385C] animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
