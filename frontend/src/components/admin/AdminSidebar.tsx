'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    Building2,
    FileText,
    AlertCircle,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Shield,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/authApi';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function AdminSidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', href: '/admin/dashboard' },
        { icon: Users, label: 'User Management', href: '/admin/users' },
        { icon: UserCheck, label: 'Agent Approvals', href: '/admin/agents' },
        { icon: Building2, label: 'Properties', href: '/admin/properties' },
        { icon: FileText, label: 'Transactions', href: '/admin/transactions' },
        { icon: AlertCircle, label: 'Disputes', href: '/admin/disputes' },
        { icon: History, label: 'Audit Logs', href: '/admin/audit-logs' },
        { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (err) {
            console.error('Logout failed', err);
            router.push('/');
        }
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 64 : 280 }}
            className="fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white shadow-xl flex flex-col border-r border-slate-800"
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center px-4 border-b border-slate-800 relative">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <motion.div
                        animate={{ opacity: collapsed ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col"
                    >
                        <span className="font-bold text-lg tracking-tight">NestFind</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Admin Portal</span>
                    </motion.div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-md"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-hide">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 flex-shrink-0 transition-colors",
                                isActive ? "text-emerald-500" : "text-slate-400 group-hover:text-white"
                            )} />

                            <motion.span
                                animate={{
                                    opacity: collapsed ? 0 : 1,
                                    width: collapsed ? 0 : 'auto',
                                    display: collapsed ? 'none' : 'block'
                                }}
                                className="font-medium whitespace-nowrap overflow-hidden"
                            >
                                {item.label}
                            </motion.span>

                            {/* Active Indicator Bar */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <motion.span
                        animate={{
                            opacity: collapsed ? 0 : 1,
                            width: collapsed ? 0 : 'auto',
                            display: collapsed ? 'none' : 'block'
                        }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                    >
                        Sign Out
                    </motion.span>
                </button>
            </div>
        </motion.aside>
    );
}
