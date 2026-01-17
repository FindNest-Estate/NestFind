'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/authApi';
import { useState } from 'react';

export default function AdminHeader() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsLoggingOut(true);
        try {
            await logout();
            router.push('/');
            router.refresh();
        } catch (err) {
            console.error('Logout failed', err);
            // Even if api fails, force client logout
            router.push('/');
        }
    };

    return (
        <header className="bg-white shadow-sm border-b-2 border-red-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">NestFind</h1>
                            <span className="ml-3 px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                                Admin
                            </span>
                        </Link>
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
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                    >
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </div>
        </header>
    );
}
