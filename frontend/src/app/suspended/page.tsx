'use client';

/**
 * Account Suspended Page
 * 
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - SUSPENDED state display
 * - Support contact
 * - Logout only
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/authApi';

export default function SuspendedPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const user = await getCurrentUser();

                // Verify user is actually in SUSPENDED state
                if (user.status !== 'SUSPENDED') {
                    // Redirect to appropriate page
                    if (user.status === 'ACTIVE') {
                        router.push('/dashboard');
                    } else if (user.status === 'IN_REVIEW') {
                        router.push('/under-review');
                    } else if (user.status === 'DECLINED') {
                        router.push('/declined');
                    } else {
                        router.push('/login');
                    }
                }
            } catch (error) {
                console.error('Status check failed:', error);
                // If auth fails, redirect to login
                router.push('/login');
            }
        };

        checkStatus();
    }, [router]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            // Clear any remaining tokens
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            // Force redirect anyway
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-amber-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Account Suspended
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        Your account has been temporarily suspended.
                        You cannot access any features at this time.
                    </p>

                    {/* Info box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                        <h2 className="text-sm font-semibold text-amber-900 mb-2">
                            Why was my account suspended?
                        </h2>
                        <p className="text-sm text-amber-700 mb-3">
                            Account suspensions may occur due to violations of our terms of service
                            or suspicious activity.
                        </p>
                        <p className="text-sm text-amber-700">
                            Please contact our support team for more information about your specific case.
                        </p>
                    </div>

                    {/* Contact support */}
                    <a
                        href="mailto:support@nestfind.com"
                        className="block w-full mb-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        Contact Support
                    </a>

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </div>
        </div>
    );
}
