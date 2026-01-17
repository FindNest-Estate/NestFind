'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { BarChart3, Users, Eye, Home, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface AgentPortfolioStats {
    active_listings: number;
    total_properties: number;
    total_views: number;
    total_visits: number;
    deals_closed: number;
    conversion_rate: number;
}

export default function AgentAnalyticsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AgentPortfolioStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await get<AgentPortfolioStats>('/agent/portfolio-stats');
                setStats(res);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load analytics</div>;

    const funnel = [
        { label: "Total Views", value: stats.total_views, icon: Eye, color: "bg-blue-100 text-blue-700" },
        { label: "Visits Request", value: stats.total_visits, icon: Users, color: "bg-indigo-100 text-indigo-700" },
        { label: "Deals Closed", value: stats.deals_closed, icon: Award, color: "bg-emerald-100 text-emerald-700" },
    ];

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
                <p className="text-gray-600 mt-1">Insights for {user?.full_name}</p>
            </div>

            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-orange-100 text-orange-700 rounded-xl">
                            <Home className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Listings</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.active_listings}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Portfolio</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.total_properties}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.conversion_rate}%</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-8">Conversion Funnel</h3>
                <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[39px] top-8 bottom-8 w-0.5 bg-gray-100 -z-10 hidden md:block"></div>

                    <div className="space-y-8">
                        {funnel.map((step, i) => (
                            <div key={i} className="flex items-center gap-6">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${step.color}`}>
                                    <step.icon className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-semibold text-gray-900">{step.label}</h4>
                                        <span className="text-xl font-bold text-gray-900">{step.value}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-gray-900 h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${i === 0 ? 100 : (step.value / Math.max(stats.total_views, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
