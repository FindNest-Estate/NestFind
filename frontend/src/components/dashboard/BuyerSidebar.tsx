"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Heart,
    MessageSquare,
    Settings,
    LogOut,
    Briefcase,
    Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function BuyerSidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    const links = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Visits', href: '/dashboard/my-visits', icon: Calendar },
        { name: 'My Deals', href: '/dashboard/deals', icon: Briefcase },
        { name: 'Favorites', href: '/dashboard/favorites', icon: Heart },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Find Properties', href: '/properties', icon: Search },
    ];

    return (
        <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col hidden md:flex">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-rose-500 to-rose-600 bg-clip-text text-transparent tracking-tight">NestFind</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Buyer</span>
                </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Platform</p>
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${isActive
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-rose-500' : 'text-gray-400 group-hover:text-gray-600'} />
                            {link.name}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100">
                <Link
                    href="/dashboard/settings"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900 mb-1 ${pathname === '/dashboard/settings' ? 'bg-gray-50' : ''}`}
                >
                    <Settings size={18} className="text-gray-400" />
                    Settings
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
