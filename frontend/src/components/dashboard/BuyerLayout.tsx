"use client";

import BuyerSidebar from "./BuyerSidebar";
import { NotificationBell } from "@/components/common/NotificationBell";
import { Menu } from 'lucide-react';
import { useState } from "react";
// Mobile Sidebar Sheet - Assuming Shadcn UI or similar, but using simple absolute div for now if needed or standard logic.

interface BuyerLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function BuyerLayout({ children, title }: BuyerLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8F9FB]">
            {/* Desktop Sidebar */}
            <BuyerSidebar />

            {/* Main Content Area */}
            <div className="md:ml-64 transition-all duration-300">
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center justify-between px-6 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <Menu size={20} />
                        </button>
                        {title && (
                            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h1>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />

                        {/* Mobile Menu Dropdown/Overlay would go here if not using Sheet */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
