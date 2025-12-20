'use client';

/**
 * Register Selection Page - Airbnb-Inspired Design
 * 
 * Professional entrance to the registration flow.
 * Replaces emojis with premium SVG icons.
 */

import Link from 'next/link';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="max-w-[480px] w-full">
                {/* Logo */}
                <div className="mb-10 text-center">
                    <span className="text-[#FF385C] text-3xl font-bold tracking-tight">NestFind</span>
                </div>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        Join NestFind
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Choose how you want to use the platform.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* User Registration Card */}
                    <Link
                        href="/register/user"
                        className="group relative flex items-start p-6 rounded-2xl border-2 border-gray-100 hover:border-[#FF385C] hover:bg-red-50/10 transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <div className="flex-shrink-0 mr-5">
                            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-colors duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-600 group-hover:text-[#FF385C] transition-colors duration-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#FF385C] transition-colors duration-300">
                                I'm a Buyer or Seller
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 leading-relaxed font-medium">
                                Find your dream home, invest in properties, or list your real estate for sale.
                            </p>
                        </div>
                        <div className="flex items-center self-center ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-300 group-hover:text-[#FF385C] group-hover:translate-x-1 transition-all duration-300">
                                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </Link>

                    {/* Agent Registration Card */}
                    <Link
                        href="/register/agent"
                        className="group relative flex items-start p-6 rounded-2xl border-2 border-gray-100 hover:border-[#FF385C] hover:bg-red-50/10 transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <div className="flex-shrink-0 mr-5">
                            <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-colors duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-600 group-hover:text-[#FF385C] transition-colors duration-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#FF385C] transition-colors duration-300">
                                I'm an Agent
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 leading-relaxed font-medium">
                                Join as a verified professional to connect with clients and grow your business.
                            </p>
                        </div>
                        <div className="flex items-center self-center ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-300 group-hover:text-[#FF385C] group-hover:translate-x-1 transition-all duration-300">
                                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </Link>
                </div>

                <div className="text-center mt-10">
                    <div className="text-base font-medium">
                        <span className="text-gray-500">Already have an account? </span>
                        <Link href="/login" className="text-gray-900 hover:text-[#FF385C] transition duration-200 hover:underline underline-offset-4 font-bold">
                            Sign in
                        </Link>
                    </div>
                </div>

                {/* Minimal Footer */}
                <div className="mt-16 text-center border-t border-gray-100 pt-8">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                        <span>Secure Registration</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
