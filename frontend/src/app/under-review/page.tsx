'use client';

/**
 * Application Under Review Page
 * 
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - IN_REVIEW state display
 * - Status polling (30s interval)
 * - Auto-redirect on status change
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/authApi';
import { logout } from '@/lib/authApi';

const POLL_INTERVAL = 30000; // 30 seconds

export default function UnderReviewPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        let pollTimer: NodeJS.Timeout;
        let isActive = true;
        let isFirstCheck = true;

        const checkStatus = async () => {
            if (!isActive) return;

            try {
                const user = await getCurrentUser();

                // Check for status changes
                if (user.status === 'ACTIVE') {
                    router.push('/agent/dashboard');
                } else if (user.status === 'DECLINED') {
                    router.push('/declined');
                } else if (user.status === 'SUSPENDED') {
                    router.push('/suspended');
                }
                // If still IN_REVIEW, stay on this page (don't redirect)
            } catch (error) {
                console.error('Status check failed:', error);
                // Only redirect to login if NOT the first check
                // First check might fail due to cookie timing issues
                if (!isFirstCheck) {
                    router.push('/login');
                }
            }
            isFirstCheck = false;
        };

        // Delay initial check to allow cookies to settle
        const initialCheckTimer = setTimeout(() => {
            checkStatus();
        }, 1000);

        // Set up polling (starts after 30s)
        pollTimer = setInterval(checkStatus, POLL_INTERVAL);

        // Cleanup
        return () => {
            isActive = false;
            clearTimeout(initialCheckTimer);
            clearInterval(pollTimer);
        };
    }, [router]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
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
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Application Under Review
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6">
                        Thank you for applying to become an agent on NestFind.
                        Our team is currently reviewing your application.
                    </p>

                    {/* Timeline */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <h2 className="text-sm font-semibold text-blue-900 mb-2">
                            What happens next?
                        </h2>
                        <ul className="text-sm text-blue-700 space-y-2">
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>Our team will verify your license and credentials</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>You'll receive an email notification once approved</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>This usually takes 1-2 business days</span>
                            </li>
                        </ul>
                    </div>

                    {/* Auto-refresh notice */}
                    <p className="text-xs text-gray-500 mb-6">
                        This page will automatically update when your application status changes.
                    </p>

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
