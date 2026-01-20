'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
    Shield,
    MessageSquare,
    FolderOpen,
    Megaphone,
    Handshake,
    UserCircle,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/authApi';
import { useRouter } from 'next/navigation';
import { getAgentMessages } from '@/lib/api/agent';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function AgentSidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [messageCount, setMessageCount] = useState(0);

    // Fetch unread message count from database
    useEffect(() => {
        async function fetchMessageCount() {
            try {
                const response = await getAgentMessages();
                if (response.success && response.conversations) {
                    const totalUnread = response.conversations.reduce(
                        (sum, c) => sum + (c.unread_count || 0),
                        0
                    );
                    setMessageCount(totalUnread);
                }
            } catch (error) {
                console.error('Failed to fetch message count:', error);
            }
        }
        fetchMessageCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchMessageCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/agent/dashboard' },
        { icon: ClipboardList, label: 'Assignments', href: '/agent/assignments' },
        { icon: Users, label: 'Visits', href: '/agent/visits' },
        { icon: MessageSquare, label: 'Messages', href: '/agent/messages', badge: messageCount > 0 ? messageCount : undefined },
        { icon: UserCircle, label: 'Lead Pipeline', href: '/agent/crm' },
        { icon: Calendar, label: 'Calendar', href: '/agent/calendar' },
        { icon: FolderOpen, label: 'Documents', href: '/agent/documents' },
        { icon: Megaphone, label: 'Marketing', href: '/agent/marketing' },
        { icon: Handshake, label: 'Negotiations', href: '/agent/negotiations' },
        { icon: BarChart3, label: 'Analytics', href: '/agent/analytics' },
        { icon: User, label: 'Profile', href: '/profile' },
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
            className="fixed left-0 top-0 z-40 h-screen bg-white/80 backdrop-blur-xl text-gray-800 shadow-2xl flex flex-col border-r border-gray-200/50"
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center px-4 border-b border-gray-200/50 relative">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <motion.div
                        animate={{ opacity: collapsed ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col"
                    >
                        <span className="font-bold text-lg tracking-tight text-rose-500">NestFind</span>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Agent Portal</span>
                    </motion.div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-colors z-50 shadow-md"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-hide">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/profile' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-rose-50 text-rose-600 font-medium"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 flex-shrink-0 transition-colors",
                                isActive ? "text-rose-500" : "text-gray-400 group-hover:text-gray-600"
                            )} />

                            <motion.span
                                animate={{
                                    opacity: collapsed ? 0 : 1,
                                    width: collapsed ? 0 : 'auto',
                                    display: collapsed ? 'none' : 'block'
                                }}
                                className="whitespace-nowrap overflow-hidden flex-1"
                            >
                                {item.label}
                            </motion.span>

                            {/* Badge for Messages etc */}
                            {'badge' in item && item.badge && !collapsed && (
                                <span className="ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {item.badge}
                                </span>
                            )}

                            {/* Active Indicator Bar */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabAgent"
                                    className="absolute left-0 top-2 bottom-2 w-1 bg-rose-500 rounded-r-full"
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
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all group",
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
