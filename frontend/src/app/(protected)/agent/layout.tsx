/**
 * Agent Dashboard Layout
 * 
 * Shell layout for AGENT role
 * Assumes route protection already handled by parent layout
 */

import { ReactNode } from 'react';
import Link from 'next/link';

export default function AgentDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">NestFind</h1>
                            <span className="ml-3 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded">
                                Agent
                            </span>
                        </div>

                        {/* Navigation */}
                        <nav className="flex space-x-4">
                            <Link
                                href="/agent/dashboard"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/agent/listings"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                My Listings
                            </Link>
                            <Link
                                href="/agent/clients"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Clients
                            </Link>
                            <Link
                                href="/profile"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Profile
                            </Link>
                        </nav>

                        {/* Logout */}
                        <Link
                            href="/api/auth/logout"
                            className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Logout
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
