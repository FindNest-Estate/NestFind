"use client";

import AgentSidebar from "./AgentSidebar";
import { Bell } from "lucide-react";
import { NotificationBell } from "@/components/common/NotificationBell";

interface AgentLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function AgentLayout({ children, title }: AgentLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <AgentSidebar />

            {/* Main Content Area */}
            <div className="ml-64 transition-all duration-300">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
                    <div>
                        {title && (
                            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
