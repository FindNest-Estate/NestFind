'use client';

import { useEffect, useState } from 'react';
import { getPlatformOverview, PlatformOverview } from '@/lib/api/admin';
import { Users, Building, AlertCircle, DollarSign, TrendingUp, Activity } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<PlatformOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const response = await getPlatformOverview();
            setStats(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load stats</div>;

    const cards = [
        {
            title: "Total Revenue",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats.total_revenue),
            icon: DollarSign,
            color: "text-emerald-600 bg-emerald-50",
            desc: "Platform fees collected"
        },
        {
            title: "Volume",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(stats.transaction_volume),
            icon: TrendingUp,
            color: "text-blue-600 bg-blue-50",
            desc: "Total transaction value"
        },
        {
            title: "Total Users",
            value: stats.total_users + stats.total_agents,
            icon: Users,
            color: "text-purple-600 bg-purple-50",
            desc: `${stats.total_agents} Agents, ${stats.total_users} Buyers`
        },
        {
            title: "Active Listings",
            value: stats.active_listings,
            icon: Building,
            color: "text-orange-600 bg-orange-50",
            desc: "Currently on market"
        },
        {
            title: "Pending Verifications",
            value: stats.pending_verifications,
            icon: AlertCircle,
            color: stats.pending_verifications > 0 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50",
            desc: "Properties needing review"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
                        <p className="text-gray-600 mt-1">Platform performance metric</p>
                    </div>
                    <button onClick={loadStats} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <Activity className="w-5 h-5" />
                    </button>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
                    {cards.map((card, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${card.color}`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
                            <p className="text-sm font-medium text-gray-500">{card.title}</p>
                            <p className="text-xs text-gray-400 mt-2">{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions & Recent */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <a href="/admin/agents" className="block p-4 border rounded-xl hover:bg-gray-50 flex justify-between items-center">
                                <span className="font-medium">Review Pending Agents</span>
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Action Required</span>
                            </a>
                            <a href="/admin/users" className="block p-4 border rounded-xl hover:bg-gray-50 flex justify-between items-center">
                                <span className="font-medium">User Management</span>
                                <span className="text-gray-400">Manage access</span>
                            </a>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">System Health</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-green-800 font-medium">Database Connection</span>
                                <span className="text-green-600 text-sm">Target: Healthy</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-green-800 font-medium">Payment Gateway</span>
                                <span className="text-green-600 text-sm">Mock Mode (Active)</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="text-green-800 font-medium">SSE Notification Service</span>
                                <span className="text-green-600 text-sm">Running</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
