"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Building2, Users, BarChart3, Plus, Loader2, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import AgentLayout from "@/components/dashboard/AgentLayout";
import AgentAnalytics from "./AgentAnalytics";

export default function AgentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ active_listings: 0, total_leads: 0, total_views: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsData = await api.dashboard.agentStats();
                setStats(statsData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <AgentLayout title="Dashboard">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-rose-500" size={32} />
                </div>
            </AgentLayout>
        );
    }

    return (
        <AgentLayout title="Dashboard">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.first_name}!</h1>
                    <p className="text-gray-500">Here's what's happening with your listings today.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Building2 size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <TrendingUp size={16} />
                                +12%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Active Listings</p>
                        <h3 className="text-3xl font-bold text-gray-900">{stats.active_listings}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <Users size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <TrendingUp size={16} />
                                +8%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Leads</p>
                        <h3 className="text-3xl font-bold text-gray-900">{stats.total_leads}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <BarChart3 size={24} />
                            </div>
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <TrendingUp size={16} />
                                +24%
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Views</p>
                        <h3 className="text-3xl font-bold text-gray-900">{stats.total_views}</h3>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/dashboard/add-property" className="flex items-center gap-4 p-4 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all group">
                            <div className="p-3 bg-rose-500 text-white rounded-lg group-hover:scale-110 transition-transform">
                                <Plus size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Add New Property</p>
                                <p className="text-sm text-gray-500">List a new property</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/agent/schedule" className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all group text-left">
                            <div className="p-3 bg-blue-500 text-white rounded-lg group-hover:scale-110 transition-transform">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">View Schedule</p>
                                <p className="text-sm text-gray-500">Check upcoming visits</p>
                            </div>
                        </Link>

                        <button className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all group text-left">
                            <div className="p-3 bg-green-500 text-white rounded-lg group-hover:scale-110 transition-transform">
                                <ArrowUpRight size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Upgrade Plan</p>
                                <p className="text-sm text-gray-500">Get premium features</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Analytics</h2>
                    <AgentAnalytics />
                </div>
            </div>
        </AgentLayout>
    );
}
