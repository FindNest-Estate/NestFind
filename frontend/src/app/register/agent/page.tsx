'use client';

/**
 * Register Agent Page - Airbnb-Inspired Design
 * 
 * Professional design system for agent onboarding.
 * Matches Login/Register User design system with added professional cues.
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAgent } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';

export default function RegisterAgentPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        mobile_number: '',
        license_id: '',
        service_radius_km: '',
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
        if (!formData.full_name || !formData.email || !formData.password || !formData.license_id || !formData.service_radius_km) {
            setError('Please fill in all required fields');
            return;
        }

        // Validate password
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        // Validate service radius
        const radius = parseInt(formData.service_radius_km);
        if (isNaN(radius) || radius <= 0) {
            setError('Service radius must be a positive number');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await registerAgent({
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                mobile_number: formData.mobile_number || undefined,
                license_id: formData.license_id,
                service_radius_km: radius,
            });

            // Success (202) - redirect to OTP verification
            if (response.message) {
                // Store email and user_id in sessionStorage for OTP page context
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
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Professional Hero Image (Desktop) */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')`,
                        // Image: Professional meeting / modern office context
                    }}
                >
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-16 text-white z-10">
                    <h2 className="text-5xl font-bold tracking-tight mb-6 drop-shadow-2xl leading-none">
                        Become a<br />Verified Agent.
                    </h2>
                    <p className="text-xl text-gray-100 drop-shadow-lg font-medium max-w-lg mb-8">
                        Join the network of top-tier real estate professionals and connect with serious buyers in your area.
                    </p>
                    {/* Trust indicators */}
                    <div className="flex gap-6 text-sm font-semibold text-white/90">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.651 3 3 0 00-4.982 1.118l-.553.553.553.553a3 3 0 004.982 1.118l.553-.553a3 3 0 003.75 3.651 3 3 0 003.447 2.515zM7.5 10.5a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                                    <path d="M11 18a1 1 0 01-1 1H2a1 1 0 01-1-1v-1a5 5 0 0110 0v1z" />
                                </svg>
                            </div>
                            <span>Verified Leads</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Secure Platform</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
                <div className="mx-auto w-full max-w-sm lg:w-[460px]"> {/* Slightly wider for agent form */}
                    <div className="mb-8 pt-8 lg:pt-0">
                        {/* Mobile Logo */}
                        <div className="lg:hidden mb-10 text-center">
                            <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                        </div>

                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2 pt-4">
                            Apply as a Verified Agent
                        </h1>
                        <p className="text-base text-gray-600">
                            Get verified to list properties and connect with clients.
                        </p>
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

                        {/* Personal Details */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    id="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                    placeholder="Jane Smith"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        disabled={isSubmitting}
                                        className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                        placeholder="jane@agency.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mobile_number" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Mobile <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        id="mobile_number"
                                        type="tel"
                                        value={formData.mobile_number}
                                        onChange={(e) => handleChange('mobile_number', e.target.value)}
                                        disabled={isSubmitting}
                                        className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                    placeholder="••••••••"
                                    required
                                />
                                <p className="mt-1.5 text-xs text-gray-500 font-medium">
                                    At least 8 characters with a letter and number
                                </p>
                            </div>
                        </div>

                        {/* Agent Credentials Group */}
                        <div className="pt-6 border-t border-gray-100 mt-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Agent Credentials</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="license_id" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        License ID
                                    </label>
                                    <input
                                        id="license_id"
                                        type="text"
                                        value={formData.license_id}
                                        onChange={(e) => handleChange('license_id', e.target.value)}
                                        disabled={isSubmitting}
                                        className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                        placeholder="ABC123456"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="service_radius_km" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Service Radius (km)
                                    </label>
                                    <input
                                        id="service_radius_km"
                                        type="number"
                                        min="1"
                                        value={formData.service_radius_km}
                                        onChange={(e) => handleChange('service_radius_km', e.target.value)}
                                        disabled={isSubmitting}
                                        className="block w-full h-12 px-4 rounded-xl border border-gray-200 outline-none shadow-sm focus:border-transparent focus:ring-2 focus:ring-[#FF385C] sm:text-base transition-all duration-200 ease-in-out placeholder-gray-400"
                                        placeholder="50"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                This helps us match you with relevant local leads.
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E61E4D] py-4 px-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting Application...
                                    </>
                                ) : (
                                    'Submit Application'
                                )}
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <span className="text-gray-600">Already have an account? </span>
                            <Link
                                href="/login"
                                className="font-semibold text-gray-900 hover:text-[#FF385C] transition duration-200 hover:underline underline-offset-4"
                            >
                                Sign in
                            </Link>
                        </div>
                    </form>

                    {/* Safe Mode Footer */}
                    <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                            </svg>
                            <span>Verified Agent • Professional Review Required</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
