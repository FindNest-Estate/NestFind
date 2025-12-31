'use client';

/**
 * Register User Page - Airbnb-Inspired Design
 * 
 * Enhanced registration with:
 * - Confirm password
 * - Mandatory mobile number (+91 format)
 * - Beautiful hero image (split-screen layout)
 * 
 * NOTE: Location is NOT required for users (only for agents)
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterUserPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirm_password: '',
        mobile_number: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (!/[a-zA-Z]/.test(password)) {
            return 'Password must contain at least one letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const validateMobile = (mobile: string): string | null => {
        const pattern = /^\+91[6-9]\d{9}$/;
        if (!pattern.test(mobile)) {
            return 'Mobile must be in +91XXXXXXXXXX format';
        }
        return null;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password || !formData.mobile_number) {
            setError('Please fill in all required fields');
            return;
        }

        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        const mobileError = validateMobile(formData.mobile_number);
        if (mobileError) {
            setError(mobileError);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await registerUser({
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                confirm_password: formData.confirm_password,
                mobile_number: formData.mobile_number,
            });

            if (response.message) {
                sessionStorage.setItem('pending_verification_email', formData.email);
                if (response.user_id) {
                    sessionStorage.setItem('pending_verification_user_id', response.user_id);
                }
                router.push('/verify-otp');
            }
        } catch (err: any) {
            if (err instanceof RateLimitError) {
                setError('Too many requests. Please wait and try again.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Hero Image (Desktop Only) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')`,
                    }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-16 text-white z-10">
                    <h2 className="text-5xl font-bold tracking-tight mb-6 drop-shadow-2xl leading-tight">
                        Start your<br />journey today.
                    </h2>
                    <p className="text-xl text-gray-100 drop-shadow-lg font-medium max-w-lg mb-8">
                        Join thousands of verified buyers and sellers finding their perfect match on NestFind.
                    </p>
                    {/* Trust indicators */}
                    <div className="flex gap-6 text-sm font-semibold text-white/90">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Zero Spam Policy</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Encrypted Data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-16 xl:px-20 bg-white relative overflow-y-auto py-8">
                <div className="mx-auto w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                    </div>

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                            Create your account
                        </h1>
                        <p className="text-base text-gray-600">
                            Buy, sell, or list properties with verified professionals.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Full Name */}
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-11 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-11 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            {/* Mobile Number */}
                            <div>
                                <label htmlFor="mobile_number" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="mobile_number"
                                    type="tel"
                                    value={formData.mobile_number}
                                    onChange={(e) => handleChange('mobile_number', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-11 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                                    placeholder="+919876543210"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">Format: +91XXXXXXXXXX</p>
                            </div>

                            {/* Password Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <PasswordInput
                                        id="password"
                                        value={formData.password}
                                        onChange={(val) => handleChange('password', val)}
                                        disabled={isSubmitting}
                                        className="h-11 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-1">
                                        Confirm <span className="text-red-500">*</span>
                                    </label>
                                    <PasswordInput
                                        id="confirm_password"
                                        value={formData.confirm_password}
                                        onChange={(val) => handleChange('confirm_password', val)}
                                        disabled={isSubmitting}
                                        className="h-11 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Min 8 characters with a letter and number</p>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E61E4D] py-3.5 px-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </button>
                        </div>

                        <div className="text-center">
                            <span className="text-gray-600">Already have an account? </span>
                            <Link href="/login" className="font-semibold text-gray-900 hover:text-[#FF385C] transition hover:underline underline-offset-4">
                                Sign in
                            </Link>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                            </svg>
                            <span>Secure, verified signup</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
