'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/authApi';
import Navbar from '@/components/Navbar';
import {
    Loader2,
    LayoutDashboard,
    Settings,
    BarChart3,
    HandCoins,
    CalendarCheck,
    Receipt,
    Home,
    Plus,
    Bell,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';

interface User {
    id: string;
    role: string;
    status: string;
    full_name: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
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
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems: NavItem[] = [
        { href: '/sell/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/sell/dashboard/listings', label: 'My Listings', icon: Home },
        { href: '/sell/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/sell/dashboard/offers', label: 'Offers', icon: HandCoins },
        { href: '/sell/dashboard/visits', label: 'Visits', icon: CalendarCheck },
        { href: '/sell/dashboard/transactions', label: 'Transactions', icon: Receipt },
        { href: '/sell/dashboard/settings', label: 'Settings', icon: Settings },
    ];

    useEffect(() => {
        async function checkAuth() {
            try {
                const userData = await getCurrentUser();
                if (userData.role !== 'USER') {
                    if (userData.role === 'AGENT') router.push('/agent/dashboard');
                    else if (userData.role === 'ADMIN') router.push('/admin/dashboard');
                    else router.push('/login');
                    return;
                }
                setUser(userData as any);
            } catch (error) {
                router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#ff385c] animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const isActive = (href: string) => {
        if (href === '/sell/dashboard') return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
                        fixed lg:sticky top-16 left-0 z-50 lg:z-30
                        w-72 h-[calc(100vh-4rem)] 
                        bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-lg
                        transform transition-transform duration-300 ease-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    `}
                >
                    {/* Sidebar Header */}
                    <div className="px-6 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Seller Portal
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">{user.full_name}</p>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Quick Action */}
                        <Link
                            href="/sell/create"
                            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#ff385c] text-white rounded-lg font-semibold hover:bg-[#d9324e] transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Listing
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="px-4 py-4 space-y-1 overflow-y-auto h-[calc(100%-14rem)]">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                        ${active
                                            ? 'bg-rose-50 text-[#ff385c]'
                                            : 'text-slate-600 hover:bg-rose-50 hover:text-[#ff385c]'
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${active ? 'text-[#ff385c]' : 'text-slate-400 group-hover:text-[#ff385c]'}`} />
                                    <span className="font-medium">{item.label}</span>
                                    {item.badge && item.badge > 0 && (
                                        <span className={`
                                            ml-auto px-2 py-0.5 text-xs font-bold rounded-full
                                            ${active ? 'bg-rose-100 text-[#ff385c]' : 'bg-slate-100 text-slate-600'}
                                        `}>
                                            {item.badge}
                                        </span>
                                    )}
                                    <ChevronRight className={`ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${active ? 'text-[#ff385c] opacity-100' : ''}`} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100/50 bg-white/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                                {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">{user.full_name}</p>
                                <p className="text-xs text-slate-500">Seller Account</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-h-[calc(100vh-4rem)] lg:pl-0">
                    {/* Mobile Header */}
                    <div className="lg:hidden sticky top-16 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
                        >
                            <Menu className="w-6 h-6 text-slate-600" />
                        </button>
                        <h1 className="font-bold text-slate-800">Seller Dashboard</h1>
                        <Link href="/sell/create" className="p-2 -mr-2 rounded-lg bg-[#ff385c] text-white">
                            <Plus className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* Page Content */}
                    <div className="p-6 max-w-7xl mx-auto">
                        {/* Desktop Page Header (shown on non-overview pages) */}
                        {pathname !== '/sell/dashboard' && (
                            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 mb-6">
                                <Link href="/sell/dashboard" className="hover:text-slate-800">Dashboard</Link>
                                <ChevronRight className="w-4 h-4" />
                                <span className="text-slate-800 font-medium">
                                    {navItems.find(item => isActive(item.href))?.label || 'Page'}
                                </span>
                            </div>
                        )}

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
