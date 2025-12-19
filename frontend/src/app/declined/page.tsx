'use client';

/**
 * Application Declined Page
 * 
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - DECLINED state display
 * - Decline reason (if available)
 * - Logout only
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/authApi';

export default function DeclinedPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [declineReason, setDeclineReason] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const user = await getCurrentUser();

                // Verify user is actually in DECLINED state
                if (user.status !== 'DECLINED') {
                    // Redirect to appropriate page
                    if (user.status === 'ACTIVE') {
                        router.push('/dashboard');
                    } else if (user.status === 'IN_REVIEW') {
                        router.push('/under-review');
                    } else if (user.status === 'SUSPENDED') {
                        router.push('/suspended');
                    } else {
                        router.push('/login');
                    }
                    return;
                }

                // Check for decline reason in user data
                // Note: This would need to be added to the API response
                // For now, we don't have access to decline reason
            } catch (error) {
                console.error('Status check failed:', error);
                router.push('/login');
            }
        };

        checkStatus();
    }, [router]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Application Declined
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        Unfortunately, we are unable to approve your agent application at this time.
                    </p>

                    {/* Decline reason (if available) */}
                    {declineReason && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                            <h2 className="text-sm font-semibold text-gray-900 mb-2">
                                Reason:
                            </h2>
                            <p className="text-sm text-gray-700">{declineReason}</p>
                        </div>
                    )}

                    {/* Next steps */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <h2 className="text-sm font-semibold text-blue-900 mb-2">
                            What can I do?
                        </h2>
                        <ul className="text-sm text-blue-700 space-y-2">
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>Contact our support team for more information</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>You may create a new account to reapply in the future</span>
                            </li>
                        </ul>
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
