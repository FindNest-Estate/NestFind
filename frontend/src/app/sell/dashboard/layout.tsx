'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/authApi';
import Navbar from '@/components/Navbar';
import { Loader2, LayoutDashboard, Settings } from 'lucide-react';

interface User {
    id: string;
    role: string;
    status: string;
    full_name: string;
}

export default function SellerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await getCurrentUser();
                // Strict Role Check: Only USER role can be a Seller.
                // Agents and Admins have their own dashboards.
                if (userData.role !== 'USER') {
                    // Redirect to appropriate dashboard if not a User
                    if (userData.role === 'AGENT') router.push('/agent/dashboard');
                    else if (userData.role === 'ADMIN') router.push('/admin/dashboard');
                    else router.push('/login');
                    return;
                }

                setUser(userData as any);
            } catch (error) {
                // Not authenticated
                router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Dashboard Header & Tabs */}
            <div className="bg-white border-b border-gray-200 pt-24 pb-0">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
                            <p className="text-gray-500">Manage your listings and view performance</p>
                        </div>

                        {/* Status Banner (if needed) */}
                        {user.status !== 'ACTIVE' && (
                            <div className="mt-4 md:mt-0 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
                                Verification Status: <span className="font-semibold">{user.status}</span>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-8">
                        <Link
                            href="/sell/dashboard/listings"
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname.includes('/listings')
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Listings
                        </Link>
                        <Link
                            href="/sell/dashboard/settings"
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname.includes('/settings')
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </div>
        </div>
    );
}
