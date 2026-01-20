'use client';

import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { User, Search } from 'lucide-react';
import AgentSidebar from './AgentSidebar';
import AgentBreadcrumb from './AgentBreadcrumb';
import NotificationBell from '../admin/NotificationBell';

interface AgentLayoutProps {
    children: ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-rose-50/30 flex">
            {/* Sidebar */}
            <AgentSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content Area */}
            <motion.div
                layout
                className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: collapsed ? 64 : 280 }}
            >
                {/* Top Header */}
                <header className="h-16 bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200/50 px-8 flex items-center justify-between shadow-sm">

                    {/* Left: Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <AgentBreadcrumb />
                    </div>

                    {/* Right: Search + Actions */}
                    <div className="flex items-center gap-4">
                        {/* Search Placeholder */}
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search properties..."
                                className="pl-10 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:border-rose-500 focus:ring-0 rounded-lg text-sm transition-all w-64 outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        {/* Notifications */}
                        <NotificationBell />

                        {/* Profile Avatar (Placeholder) */}
                        <button className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all">
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">Agent</span>
                            <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
                                <User className="w-4 h-4 text-rose-600" />
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
