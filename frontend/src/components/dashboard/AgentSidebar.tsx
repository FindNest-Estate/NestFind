"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    Calendar,
    Building2,
    MessageSquare,
    Handshake,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    Bell,
    User,
    Users,
    DollarSign
} from "lucide-react";
import { useState } from "react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/agent/schedule", label: "Schedule", icon: Calendar },
    { href: "/dashboard/agent/properties", label: "My Properties", icon: Building2 },
    { href: "/dashboard/agent/leads", label: "Leads", icon: Users },
    { href: "/dashboard/chat", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/deals", label: "Deals", icon: Handshake },
    { href: "/dashboard/agent/earnings", label: "Earnings", icon: DollarSign },
];

const bottomNavItems = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function AgentSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 z-50 ${collapsed ? "w-20" : "w-64"
                }`}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            N
                        </div>
                        <span className="font-semibold text-lg">NestFind</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* User Info */}
            {!collapsed && user && (
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={20} className="text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-gray-400 truncate">Agent</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${active
                                        ? "bg-rose-500 text-white"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                        }`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon size={20} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom Navigation */}
            <div className="border-t border-gray-800 py-4 px-3 space-y-1">
                {bottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${active
                                ? "bg-rose-500 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
