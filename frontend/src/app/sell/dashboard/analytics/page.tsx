'use client';

import React, { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Eye,
    Heart,
    MessageCircle,
    Loader2,
    Calendar,
    Home,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

interface TrendPoint {
    date: string;
    value: number;
}

interface AnalyticsData {
    success: boolean;
    views_trend: TrendPoint[];
    saves_trend: TrendPoint[];
    inquiries_trend: TrendPoint[];
    total_views_30d: number;
    total_saves_30d: number;
    total_inquiries_30d: number;
    top_property: {
        id: string;
        title: string;
        views: number;
    } | null;
}

export default function SellerAnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);

    useEffect(() => {
        async function loadAnalytics() {
            try {
                setIsLoading(true);
                const data = await get<AnalyticsData>(`/seller/analytics?days=${timeRange}`);
                setAnalytics(data);
            } catch (err) {
                console.error("Failed to load analytics", err);
                setError("Failed to load analytics data");
            } finally {
                setIsLoading(false);
            }
        }
        loadAnalytics();
    }, [timeRange]);

    const metrics = analytics ? [
        {
            title: 'Total Views',
            value: analytics.total_views_30d,
            change: 12,
            icon: Eye,
            color: 'from-blue-500 to-indigo-500',
            bgColor: 'from-blue-50 to-indigo-50'
        },
        {
            title: 'Property Saves',
            value: analytics.total_saves_30d,
            change: 8,
            icon: Heart,
            color: 'from-pink-500 to-rose-500',
            bgColor: 'from-pink-50 to-rose-50'
        },
        {
            title: 'Inquiries',
            value: analytics.total_inquiries_30d,
            change: -3,
            icon: MessageCircle,
            color: 'from-purple-500 to-violet-500',
            bgColor: 'from-purple-50 to-violet-50'
        }
    ] : [];

    // Simple bar chart component
    const SimpleBarChart = ({ data, color }: { data: TrendPoint[]; color: string }) => {
        if (data.length === 0) return null;
        const maxValue = Math.max(...data.map(d => d.value), 1);

        return (
            <div className="flex items-end gap-1 h-24">
                {data.map((point, index) => (
                    <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                    >
                        <div
                            className={`w-full rounded-t-sm ${color} transition-all duration-500`}
                            style={{ height: `${(point.value / maxValue) * 100}%`, minHeight: point.value > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[10px] text-slate-400 transform -rotate-45 origin-top-left">
                            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[#ff385c] animate-spin" />
                    <p className="text-slate-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-red-500 font-medium">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-[#ff385c]" />
                        Analytics
                    </h1>
                    <p className="text-slate-500 mt-1">Track your property performance and buyer engagement</p>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl p-1 border border-slate-200/50">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => setTimeRange(days as 7 | 30 | 90)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === days
                                ? 'bg-[#ff385c] text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={metric.title}
                            className={`relative overflow-hidden bg-gradient-to-br ${metric.bgColor} rounded-2xl p-6 border border-white/50 shadow-sm`}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.color} shadow-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${metric.change >= 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {metric.change >= 0 ? (
                                        <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                        <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    {Math.abs(metric.change)}%
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-3xl font-bold text-slate-800">{metric.value.toLocaleString()}</p>
                                <p className="text-sm text-slate-500 mt-1">{metric.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views Trend */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">Views Trend</h3>
                            <p className="text-sm text-slate-500">Daily property views</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    {analytics?.views_trend && analytics.views_trend.length > 0 ? (
                        <SimpleBarChart data={analytics.views_trend} color="bg-gradient-to-t from-blue-500 to-blue-400" />
                    ) : (
                        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
                            No data available
                        </div>
                    )}
                </div>

                {/* Saves Trend */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">Saves Trend</h3>
                            <p className="text-sm text-slate-500">Properties saved by buyers</p>
                        </div>
                        <div className="p-2 bg-pink-100 rounded-lg">
                            <Heart className="w-5 h-5 text-pink-600" />
                        </div>
                    </div>
                    {analytics?.saves_trend && analytics.saves_trend.length > 0 ? (
                        <SimpleBarChart data={analytics.saves_trend} color="bg-gradient-to-t from-pink-500 to-pink-400" />
                    ) : (
                        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Top Performing Property */}
            {analytics?.top_property && (
                <div className="bg-[#ff385c] rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white/80 text-sm">Top Performing Property</p>
                            <h3 className="text-xl font-bold mt-1">{analytics.top_property.title}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold">{analytics.top_property.views}</p>
                            <p className="text-white/80 text-sm">total views</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Insights */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#ff385c]" />
                    Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Average Daily Views</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">
                            {analytics ? Math.round(analytics.total_views_30d / timeRange) : 0}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Save Rate</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">
                            {analytics && analytics.total_views_30d > 0
                                ? ((analytics.total_saves_30d / analytics.total_views_30d) * 100).toFixed(1)
                                : 0}%
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Inquiry Rate</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">
                            {analytics && analytics.total_views_30d > 0
                                ? ((analytics.total_inquiries_30d / analytics.total_views_30d) * 100).toFixed(1)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
