/**
 * User Dashboard Layout
 * 
 * Shell layout for USER role (Buyer/Seller)
 * Assumes route protection already handled by parent layout
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { logout } from '@/lib/authApi';

export default function UserDashboardLayout({
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
                        </div>

                        {/* Navigation */}
                        <nav className="flex space-x-4">
                            <Link
                                href="/dashboard"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/properties"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Properties
                            </Link>
                            <Link
                                href="/find-agent"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Find Agent
                            </Link>
                            <Link
                                href="/profile"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Profile
                            </Link>
                        </nav>

                        {/* Logout */}
                        <form action={async () => {
                            'use server';
                            await logout();
                        }}>
                            <button
                                type="submit"
                                className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Logout
                            </button>
                        </form>
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
