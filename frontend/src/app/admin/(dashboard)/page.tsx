'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Users,
    Home,
    CreditCard,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign
} from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.admin.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch admin stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const kpiCards = [
        {
            title: 'Total Revenue',
            value: `₹${stats?.revenue?.total?.toLocaleString()}`,
            change: '+12.5%',
            trend: 'up',
            icon: DollarSign,
            color: 'bg-green-500',
            subtext: `₹${stats?.revenue?.this_month?.toLocaleString()} this month`
        },
        {
            title: 'Active Users',
            value: stats?.users?.active?.toLocaleString(),
            change: `+${stats?.users?.new_today} today`,
            trend: 'up',
            icon: Users,
            color: 'bg-blue-500',
            subtext: `${stats?.users?.total} total registered`
        },
        {
            title: 'Properties',
            value: stats?.properties?.total?.toLocaleString(),
            change: `${stats?.properties?.pending} pending`,
            trend: 'neutral',
            icon: Home,
            color: 'bg-purple-500',
            subtext: 'Total listings'
        },
        {
            title: 'Completed Deals',
            value: stats?.deals?.completed?.toLocaleString(),
            change: '+5%',
            trend: 'up',
            icon: CreditCard,
            color: 'bg-indigo-500',
            subtext: `${stats?.deals?.total} total offers`
        }
    ];

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                                <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trend === 'up' ? 'bg-green-50 text-green-700' :
                                card.trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                                }`}>
                                {card.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {card.change}
                            </div>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{card.subtext}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity & Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Revenue Trend</h2>
                        <select className="text-sm border-gray-200 rounded-lg text-gray-500 focus:ring-indigo-500 focus:border-indigo-500">
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {/* Real Chart Bars */}
                        {stats?.revenue_trend?.map((amount: number, i: number) => {
                            const max = Math.max(...(stats.revenue_trend || [1]));
                            const height = max > 0 ? (amount / max) * 100 : 0;
                            return (
                                <div key={i} className="w-full bg-indigo-50 rounded-t-sm relative group">
                                    <div
                                        className="absolute bottom-0 w-full bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-600"
                                        style={{ height: `${height}%` }}
                                    ></div>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                                        ₹{amount.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-gray-400">
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
                    <div className="space-y-6">
                        {stats?.recent_activity?.length > 0 ? (
                            stats.recent_activity.map((activity: any, i: number) => (
                                <div key={i} className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Activity size={14} className="text-gray-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-900 font-medium">{activity.type}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                                        <p className="text-xs text-gray-400 mt-1">{timeAgo(activity.time)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
                        )}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
}
