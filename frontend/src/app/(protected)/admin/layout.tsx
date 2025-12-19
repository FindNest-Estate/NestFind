/**
 * Admin Dashboard Layout
 * 
 * Shell layout for ADMIN role
 * Assumes route protection already handled by parent layout
 */

import { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b-2 border-red-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">NestFind</h1>
                            <span className="ml-3 px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                                Admin
                            </span>
                        </div>

                        {/* Navigation */}
                        <nav className="flex space-x-4">
                            <Link
                                href="/admin/dashboard"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/admin/agents"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Agent Approvals
                            </Link>
                            <Link
                                href="/admin/users"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                User Management
                            </Link>
                            <Link
                                href="/admin/reports"
                                className="text-gray-700 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Reports
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
