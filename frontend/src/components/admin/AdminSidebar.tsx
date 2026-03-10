'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    History,
    Activity,
    Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/authApi';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/admin/dashboard' },
    { icon: Users, label: 'User Management', href: '/admin/users' },
    { icon: UserCheck, label: 'Agent Approvals', href: '/admin/agents' },
    { icon: Building2, label: 'Properties', href: '/admin/properties' },
    { icon: FileText, label: 'Transactions', href: '/admin/transactions' },
    { icon: AlertCircle, label: 'Disputes', href: '/admin/disputes' },
    { icon: Activity, label: 'Operations', href: '/admin/operations' },
    { icon: History, label: 'Audit Logs', href: '/admin/audit-logs' },
    { icon: Server, label: 'System Health', href: '/admin/system-health' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminSidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch {
            router.push('/');
        }
    };

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen bg-white border-r border-[var(--gray-200)] flex flex-col transition-[width] duration-200',
                collapsed ? 'w-16' : 'w-[var(--sidebar-width)]'
            )}
        >
            {/* Logo */}
            <div className="h-[var(--navbar-height)] flex items-center px-4 border-b border-[var(--gray-200)] relative">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <div className="w-8 h-8 bg-[var(--color-brand)] rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-[var(--gray-900)] tracking-tight">NestFind</span>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--gray-400)] font-semibold">Admin</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-[var(--gray-300)] rounded-full flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-700)] hover:border-[var(--gray-400)] transition-colors z-50 shadow-[var(--shadow-xs)]"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navItems.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-colors text-sm relative group',
                                isActive
                                    ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)] font-medium'
                                    : 'text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={cn(
                                'w-[18px] h-[18px] shrink-0',
                                isActive ? 'text-[var(--color-brand)]' : 'text-[var(--gray-400)] group-hover:text-[var(--gray-600)]'
                            )} />
                            {!collapsed && <span className="truncate">{item.label}</span>}

                            {isActive && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[var(--color-brand)] rounded-r" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Sign Out */}
            <div className="p-3 border-t border-[var(--gray-200)]">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--gray-500)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] transition-colors',
                        collapsed && 'justify-center px-0'
                    )}
                >
                    <LogOut className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
