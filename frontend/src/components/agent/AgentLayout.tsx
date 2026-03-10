'use client';

import { useState, ReactNode } from 'react';
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
        <div className="min-h-screen bg-[var(--gray-50)]/50 flex text-[var(--gray-900)]">
            {/* Sidebar */}
            <AgentSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: collapsed ? 72 : 280 }}
            >
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-[var(--gray-200)] px-6 flex items-center justify-between shadow-sm">

                    {/* Left: Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <AgentBreadcrumb />
                    </div>

                    {/* Right: Search + Actions */}
                    <div className="flex items-center gap-5">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray-400)] pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="pl-10 pr-4 py-2 bg-[var(--gray-50)] hover:bg-[var(--gray-100)] border border-transparent focus:bg-white focus:border-[var(--gray-300)] focus:ring-4 focus:ring-[var(--gray-100)] rounded-xl text-[13px] font-medium transition-all w-64 outline-none placeholder:text-[var(--gray-500)] text-[var(--gray-900)]"
                            />
                        </div>

                        <div className="h-6 w-px bg-[var(--gray-200)] hidden sm:block" />

                        <div className="flex items-center gap-3">
                            {/* Notifications */}
                            <NotificationBell />

                            {/* Profile Avatar */}
                            <button className="flex items-center p-1 rounded-full hover:bg-[var(--gray-100)] border border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--gray-300)]">
                                <div className="w-8 h-8 bg-gradient-to-tr from-[var(--gray-800)] to-[var(--gray-900)] rounded-full flex items-center justify-center border border-[var(--gray-200)] shadow-sm shrink-0">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-x-hidden">
                    <div className="max-w-[1400px] mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
