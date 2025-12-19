'use client';

/**
 * User Registration Page (Buyer/Seller)
 * 
 * Based on:
 * - frontend/docs/auth_contract.md
 * - frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - User registration form
 * - Transition to OTP_REQUIRED state
 * - Redirect to /verify-otp on success
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';

export default function RegisterUserPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate required fields
        if (!formData.full_name || !formData.email || !formData.password) {
            setError('Please fill in all required fields');
            return;
        }

        // Validate password
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await registerUser({
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                mobile_number: formData.mobile_number || undefined,
            });

            // Success (202) - redirect to OTP verification
            if (response.message) {
                // Store email in sessionStorage for OTP page context
                sessionStorage.setItem('pending_verification_email', formData.email);
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">NestFind</h1>
                    <h2 className="mt-6 text-2xl font-semibold text-gray-700">
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join as a Buyer or Seller
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Minimum 8 characters, at least 1 letter and 1 number
                            </p>
                        </div>

                        <div>
                            <label htmlFor="mobile_number" className="block text-sm font-medium text-gray-700">
                                Mobile Number (Optional)
                            </label>
                            <input
                                id="mobile_number"
                                name="mobile_number"
                                type="tel"
                                value={formData.mobile_number}
                                onChange={(e) => handleChange('mobile_number', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>

                    <div className="text-center space-y-2">
                        <div className="text-sm">
                            <span className="text-gray-600">Already have an account? </span>
                            <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                                Sign in
                            </Link>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600">Want to become an agent? </span>
                            <Link href="/register/agent" className="font-medium text-emerald-600 hover:text-emerald-500">
                                Register as Agent
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
