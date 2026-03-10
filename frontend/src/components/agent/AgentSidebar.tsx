'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList,
    Calendar,
    Users,
    BarChart3,
    User,
    ChevronLeft,
    ChevronRight,
    LogOut,
    MessageSquare,
    FolderOpen,
    Megaphone,
    ArrowRightLeft,
    Briefcase,
    FileText,
    Files,
    Settings,
    Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/authApi';
import { useRouter } from 'next/navigation';
import { getAgentMessages } from '@/lib/api/agent';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

type NavItem = {
    icon: any;
    label: string;
    href: string;
    badge?: number;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

export default function AgentSidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [messageCount, setMessageCount] = useState(0);

    useEffect(() => {
        async function fetchMessageCount() {
            try {
                const response = await getAgentMessages();
                if (response.success && response.conversations) {
                    const totalUnread = response.conversations.reduce(
                        (sum, c) => sum + (c.unread_count || 0), 0
                    );
                    setMessageCount(totalUnread);
                }
            } catch {
                // Silent
            }
        }
        fetchMessageCount();
        const interval = setInterval(fetchMessageCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const navGroups: NavGroup[] = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/agent/dashboard' },
                { icon: BarChart3, label: 'Analytics', href: '/agent/analytics' },
            ]
        },
        {
            title: 'Work',
            items: [
                { icon: ClipboardList, label: 'Assignments', href: '/agent/assignments' },
                { icon: Users, label: 'Visits', href: '/agent/visits' },
                { icon: FileText, label: 'Offers', href: '/agent/offers' },
                { icon: ArrowRightLeft, label: 'Transactions', href: '/agent/transactions' },
            ]
        },
        {
            title: 'Pipeline',
            items: [
                { icon: Briefcase, label: 'CRM', href: '/agent/crm' },
                { icon: Flame, label: 'Follow-Ups', href: '/agent/followups' },
            ]
        },
        {
            title: 'Communication',
            items: [
                { icon: MessageSquare, label: 'Messages', href: '/agent/messages', badge: messageCount },
            ]
        },
        {
            title: 'Resources',
            items: [
                { icon: FolderOpen, label: 'Documents', href: '/agent/documents' },
                { icon: Calendar, label: 'Calendar', href: '/agent/calendar' },
                { icon: Megaphone, label: 'Marketing', href: '/agent/marketing' },
            ]
        },
        {
            title: 'Account',
            items: [
                { icon: Settings, label: 'Settings', href: '/agent/settings' },
            ]
        }
    ];

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
                'fixed left-0 top-0 z-40 h-screen bg-white border-r border-[var(--gray-200)] flex flex-col transition-[width] duration-300 ease-in-out shadow-[1px_0_10px_rgba(0,0,0,0.02)]',
                collapsed ? 'w-[72px]' : 'w-[280px]'
            )}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center px-4 border-b border-[var(--gray-100)] relative shrink-0">
                <div className={cn(
                    "flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300",
                    collapsed ? "justify-center w-full" : ""
                )}>
                    <div className="w-8 h-8 bg-[var(--gray-900)] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                        <Files className="w-4 h-4 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col opacity-100 transition-opacity duration-300 delay-100">
                            <span className="font-bold text-[15px] text-[var(--gray-900)] tracking-tight leading-tight">NestFind</span>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--gray-500)] font-bold">Agent Portal</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-[var(--gray-200)] rounded-full flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-900)] hover:border-[var(--gray-300)] hover:shadow-sm transition-all z-50 text-xs"
                >
                    {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Navigation Options */}
            <div className="flex-1 overflow-y-auto py-5 px-3 space-y-7 hide-scrollbar">
                {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1.5">
                        {!collapsed && (
                            <h3 className="px-3 text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider mb-2.5 opacity-100 transition-opacity duration-300 delay-100">
                                {group.title}
                            </h3>
                        )}
                        {group.items.map(item => {
                            const isActive = pathname === item.href || (item.href !== '/agent/settings' && pathname.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative',
                                        collapsed ? 'justify-center mx-1' : '',
                                        isActive
                                            ? 'bg-[var(--gray-900)] shadow-sm'
                                            : 'hover:bg-[var(--gray-50)]'
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <item.icon className={cn(
                                        'w-5 h-5 shrink-0 transition-colors',
                                        isActive ? 'text-white' : 'text-[var(--gray-500)] group-hover:text-[var(--gray-900)]'
                                    )} />

                                    {!collapsed && (
                                        <span className={cn(
                                            "truncate flex-1 text-[13px] transition-colors font-medium",
                                            isActive ? 'text-white' : 'text-[var(--gray-600)] group-hover:text-[var(--gray-900)]'
                                        )}>
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Badge */}
                                    {item.badge ? (
                                        !collapsed && (
                                            <span className={cn(
                                                "px-1.5 py-0.5 text-[10px] font-bold rounded-full flex items-center justify-center min-w-[1.25rem] transition-colors",
                                                isActive ? "bg-white/20 text-white" : "bg-[var(--gray-900)] text-white shadow-sm"
                                            )}>
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )
                                    ) : null}

                                    {/* Collapsed Tooltip Indicator */}
                                    {collapsed && item.badge && (
                                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Profile / Actions Footer */}
            <div className="p-4 border-t border-[var(--gray-100)] bg-[var(--gray-50)]/50">
                <button
                    onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-[var(--gray-600)] hover:bg-white hover:text-red-600 hover:shadow-sm hover:border hover:border-red-100 border border-transparent',
                        collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? "Sign Out" : undefined}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
