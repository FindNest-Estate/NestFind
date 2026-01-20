'use client';

import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminBreadcrumb from './AdminBreadcrumb';
import AdminSearch from './AdminSearch';
import NotificationBell from './NotificationBell';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content Area */}
            <motion.div
                layout
                className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: collapsed ? 64 : 280 }}
            >
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-8 flex items-center justify-between">

                    {/* Left: Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <AdminBreadcrumb />
                    </div>

                    {/* Right: Search + Actions */}
                    <div className="flex items-center gap-4">
                        <AdminSearch />

                        <div className="h-6 w-px bg-slate-200 mx-2" />

                        {/* Notifications */}
                        <NotificationBell />

                        {/* Profile Avatar (Placeholder) */}
                        <button className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">
                            <span className="text-sm font-medium text-slate-700 hidden sm:block">Admin</span>
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                                <User className="w-4 h-4 text-emerald-600" />
                            </div>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </motion.div>
        </div>
    );
}
