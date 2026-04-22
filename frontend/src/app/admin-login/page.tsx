'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { login as loginApi } from '@/lib/authApi';
import { useAuth } from '@/lib/auth';
import { RateLimitError } from '@/lib/api';

function AdminLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin } = useAuth();
    const returnUrl = searchParams.get('returnUrl') || '/admin';
    const sessionExpired = searchParams.get('session_expired') === 'true';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (sessionExpired) {
            setError('Admin session expired. Please log in again.');
        }
    }, [sessionExpired]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await loginApi({ email, password, portal: 'admin' });

            // Check for login error - backend returns success: false with message
            if ('success' in response && !response.success) {
                // Use message field (backend returns 'message' not 'error')
                const errorMessage = (response as any).message || response.error || 'Login failed';

                // Provide user-friendly error messages
                if (errorMessage.toLowerCase().includes('invalid credentials')) {
                    setError('Incorrect email or password. Please try again.');
                } else if (errorMessage.toLowerCase().includes('admin portal')) {
                    setError('Access denied. This account does not have admin privileges.');
                } else if (errorMessage.toLowerCase().includes('locked')) {
                    setError('Account temporarily locked due to too many failed attempts. Please try again later.');
                } else if (errorMessage.toLowerCase().includes('suspended')) {
                    setError('Your account has been suspended. Contact support for assistance.');
                } else {
                    setError(errorMessage);
                }
                return;
            }

            // Success - has access_token
            if ('access_token' in response) {
                // Use centralized auth context to persist token and update state
                authLogin(response.access_token, response.user, response.refresh_token);

                if (response.user.status === 'ACTIVE') {
                    router.push(returnUrl);
                } else {
                    setError('Account not active. Please contact support.');
                }
            } else {
                // Unexpected response format
                setError('Unexpected response. Please try again.');
            }
        } catch (err: any) {
            console.error('[Admin Login Error]', err);

            if (err instanceof RateLimitError) {
                setError('Too many login attempts. Please wait a few minutes and try again.');
            } else if (err?.message && err.message !== 'Login failed') {
                // Use message from error if available
                setError(err.message);
            } else if (err?.data?.message) {
                setError(err.data.message);
            } else if (err?.data?.error) {
                setError(err.data.error);
            } else if (err?.data?.detail) {
                setError(err.data.detail);
            } else {
                setError('Login failed. Please check your credentials and try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen font-sans flex items-center justify-center p-4 overflow-hidden">
            {/* Full Background Image */}
            <div className="fixed inset-0 z-0 bg-slate-950">
                <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
                    alt="Corporate Office"
                    className="w-full h-full object-cover opacity-60 grayscale"
                />
                {/* Professional Dark Overlay */}
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
            </div>

            {/* Corporate Logo (Outside Card - Top Left) */}
            <div className="absolute top-8 left-8 sm:top-12 sm:left-12 z-20">
                <Link href="/" className="inline-block transition-opacity hover:opacity-80 text-decoration-none">
                    <span className="text-4xl font-extrabold text-[#FF385C] tracking-tight drop-shadow-md">NestFind</span>
                </Link>
            </div>

            {/* Login Box Wrapper */}
            <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
                {/* Shield Icon Top */}
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 mb-6 relative z-20">
                    <Shield className="w-8 h-8 text-[#FF385C]" />
                </div>

                {/* Main Glass Card */}
                <div className="w-full bg-white shadow-2xl shadow-black/50 rounded-[1.5rem] p-8 sm:p-10 border border-white/20">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Portal</h1>
                        <p className="text-sm text-slate-500 mt-2">Sign in to manage the NestFind platform.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                       {/* Error Message */}
                       {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}
                        
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Admin Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@nestfind.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl 
                                             text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF385C] focus:ring-4 
                                             focus:ring-[#FF385C]/10 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl 
                                             text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF385C] focus:ring-4 
                                             focus:ring-[#FF385C]/10 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-slate-900 text-white font-semibold 
                                     rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 
                                     disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 mt-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Sign In to Admin Panel'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            ← Back to User Login
                        </Link>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-8 text-center relative z-10">
                    <p className="text-xs font-medium text-slate-400">
                        🔒 Secure Admin Portal • Restricted Access
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>}>
            <AdminLoginContent />
        </Suspense>
    );
}
