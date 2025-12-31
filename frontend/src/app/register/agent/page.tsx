'use client';

/**
 * Register Agent Page - Airbnb-Inspired Design
 * 
 * Enhanced registration with:
 * - Confirm password
 * - Mandatory mobile number (+91 format)
 * - Map-based location picker
 * - PAN and Aadhaar verification
 * - Service radius
 * - Beautiful professional hero image
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAgent } from '@/lib/authApi';
import { RateLimitError } from '@/lib/api';
import LocationPicker from '@/components/LocationPicker';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterAgentPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirm_password: '',
        mobile_number: '',
        latitude: 0,
        longitude: 0,
        address: '',
        pan_number: '',
        aadhaar_number: '',
        service_radius_km: '',
    });
    const [locationSelected, setLocationSelected] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
        if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
        return null;
    };

    const validateMobile = (mobile: string): string | null => {
        const pattern = /^\+91[6-9]\d{9}$/;
        if (!pattern.test(mobile)) return 'Mobile must be in +91XXXXXXXXXX format';
        return null;
    };

    const validatePAN = (pan: string): string | null => {
        const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
        if (!pattern.test(pan)) return 'PAN must be in format ABCDE1234F';
        return null;
    };

    const validateAadhaar = (aadhaar: string): string | null => {
        const pattern = /^\d{12}$/;
        if (!pattern.test(aadhaar)) return 'Aadhaar must be 12 digits';
        return null;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.full_name || !formData.email || !formData.password ||
            !formData.confirm_password || !formData.mobile_number ||
            !formData.pan_number || !formData.aadhaar_number || !formData.service_radius_km) {
            setError('Please fill in all required fields');
            return;
        }

        const passwordError = validatePassword(formData.password);
        if (passwordError) { setError(passwordError); return; }

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        const mobileError = validateMobile(formData.mobile_number);
        if (mobileError) { setError(mobileError); return; }

        const panError = validatePAN(formData.pan_number);
        if (panError) { setError(panError); return; }

        const aadhaarError = validateAadhaar(formData.aadhaar_number);
        if (aadhaarError) { setError(aadhaarError); return; }

        const radius = parseInt(formData.service_radius_km);
        if (isNaN(radius) || radius <= 0 || radius > 100) {
            setError('Service radius must be between 1 and 100 km');
            return;
        }

        if (!locationSelected) {
            setError('Please select your location on the map');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await registerAgent({
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                confirm_password: formData.confirm_password,
                mobile_number: formData.mobile_number,
                latitude: formData.latitude,
                longitude: formData.longitude,
                address: formData.address || undefined,
                pan_number: formData.pan_number,
                aadhaar_number: formData.aadhaar_number,
                service_radius_km: radius,
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

    const handleLocationSelect = (lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setLocationSelected(true);
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Fixed Professional Agent Image (Desktop) */}
            <div className="hidden lg:block lg:w-1/2 fixed left-0 top-0 h-screen bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-top"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')`,
                    }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-16 text-white z-10">
                    <h2 className="text-5xl font-bold tracking-tight mb-6 drop-shadow-2xl leading-tight">
                        Become a<br />Verified Agent.
                    </h2>
                    <p className="text-xl text-gray-100 drop-shadow-lg font-medium max-w-lg mb-8">
                        Join the network of top-tier real estate professionals and connect with serious buyers in your area.
                    </p>
                    {/* Trust indicators */}
                    <div className="flex gap-6 text-sm font-semibold text-white/90">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                                </svg>
                            </div>
                            <span>Verified Leads</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Secure Platform</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Premium Support</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Scrollable Form */}
            <div className="flex-1 lg:ml-[50%] min-h-screen overflow-y-auto px-4 sm:px-6 lg:px-12 xl:px-16 bg-white py-6">
                <div className="mx-auto w-full max-w-lg">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-6 text-center">
                        <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                    </div>

                    {/* Header */}
                    <div className="mb-5">
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-gray-900 mb-1">
                            Apply as a Verified Agent
                        </h1>
                        <p className="text-sm text-gray-600">
                            Get verified to list properties and connect with clients.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-sm">{error}</span>
                            </div>
                        )}

                        {/* Personal Details */}
                        <div className="space-y-3">
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
                                    className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                    placeholder="Jane Smith"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
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
                                        className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                        placeholder="jane@agency.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mobile_number" className="block text-sm font-semibold text-gray-700 mb-1">
                                        Mobile <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="mobile_number"
                                        type="tel"
                                        value={formData.mobile_number}
                                        onChange={(e) => handleChange('mobile_number', e.target.value)}
                                        disabled={isSubmitting}
                                        className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                        placeholder="+919876543210"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <PasswordInput
                                        id="password"
                                        value={formData.password}
                                        onChange={(val) => handleChange('password', val)}
                                        disabled={isSubmitting}
                                        className="h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
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
                                        className="h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Verification Documents */}
                        <div className="pt-3 border-t border-gray-100">
                            <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">
                                Verification Documents
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="pan_number" className="block text-sm font-semibold text-gray-700 mb-1">
                                        PAN <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="pan_number"
                                        type="text"
                                        value={formData.pan_number}
                                        onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                                        disabled={isSubmitting}
                                        className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm uppercase"
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="aadhaar_number" className="block text-sm font-semibold text-gray-700 mb-1">
                                        Aadhaar <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="aadhaar_number"
                                        type="text"
                                        value={formData.aadhaar_number}
                                        onChange={(e) => handleChange('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                                        disabled={isSubmitting}
                                        className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                        placeholder="123456789012"
                                        maxLength={12}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-3">
                                <label htmlFor="service_radius_km" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Service Radius (km) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="service_radius_km"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.service_radius_km}
                                    onChange={(e) => handleChange('service_radius_km', e.target.value)}
                                    disabled={isSubmitting}
                                    className="block w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#FF385C] transition-all text-sm"
                                    placeholder="50"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">Maximum 100 km</p>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="pt-3 border-t border-gray-100">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Service Location <span className="text-red-500">*</span>
                            </label>
                            <LocationPicker
                                onLocationSelect={handleLocationSelect}
                                disabled={isSubmitting}
                                showCurrentLocationButton={true}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[#FF385C] to-[#E61E4D] py-3 px-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Application'
                                )}
                            </button>
                        </div>

                        <div className="text-center text-sm">
                            <span className="text-gray-600">Already have an account? </span>
                            <Link href="/login" className="font-semibold text-gray-900 hover:text-[#FF385C] transition hover:underline underline-offset-4">
                                Sign in
                            </Link>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex justify-center">
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
