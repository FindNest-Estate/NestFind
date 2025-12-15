"use client";

import { Search, Bell, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

export default function AgentTopBar() {
    const { user } = useAuth();

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-30">
            {/* Search */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search properties, leads, or messages..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                <NotificationDropdown />

                <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500">{user?.agency_name || "Independent Agent"}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {user?.first_name?.[0] || <User size={18} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
