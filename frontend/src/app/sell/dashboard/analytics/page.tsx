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
    ArrowDownRight,
    Trophy,
    Zap,
    AlertCircle,
    ArrowRight,
    Activity
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100/60 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-rose-500 rounded-2xl shadow-sm">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        Analytics
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Track your property performance and buyer engagement</p>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md rounded-2xl p-1.5 border border-gray-200/60 shadow-inner">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => setTimeRange(days as 7 | 30 | 90)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${timeRange === days
                                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-200/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            {days} Days
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
                            className={`relative overflow-hidden bg-white/90 backdrop-blur-lg rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700 ease-out" />
                            <div className="flex items-start justify-between relative z-10">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${metric.color} shadow-lg shadow-${metric.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm ${metric.change >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                    }`}>
                                    {metric.change >= 0 ? (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                    )}
                                    {Math.abs(metric.change)}%
                                </div>
                            </div>
                            <div className="mt-6 relative z-10">
                                <p className="text-2xl font-bold text-gray-900 tracking-tight">{metric.value.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{metric.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Views Trend */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <h3 className="font-bold text-gray-900 text-xl tracking-tight">Views Trend</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1 mb-6">Property page views over the last {timeRange} days</p>
                        {analytics?.views_trend && analytics.views_trend.length > 0 ? (
                            <SimpleBarChart data={analytics.views_trend} color="bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg" />
                        ) : (
                            <div className="h-24 flex items-center justify-center text-gray-400 font-medium text-sm">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Saves Trend */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <h3 className="font-bold text-gray-900 text-xl tracking-tight">Saves Trend</h3>
                        <p className="text-sm font-medium text-gray-500 mt-1 mb-6">Properties saved by buyers over the last {timeRange} days</p>
                        {analytics?.saves_trend && analytics.saves_trend.length > 0 ? (
                            <SimpleBarChart data={analytics.saves_trend} color="bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-lg" />
                        ) : (
                            <div className="h-24 flex items-center justify-center text-gray-400 font-medium text-sm">
                                No data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Performing Property */}
            {analytics?.top_property && (
                <div className="relative bg-gradient-to-r from-[#FF385C] via-rose-500 to-orange-500 rounded-3xl p-8 shadow-lg overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
                        <TrendingUp className="w-48 h-48 text-white scale-125 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/30">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <div className="relative z-20 flex-1 pl-4 sm:pl-8">
                            <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-300" />
                                Top Performing Property
                            </p>
                            <h3 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">{analytics.top_property.title}</h3>
                            <div className="mt-6 flex flex-wrap gap-8">
                                <div>
                                    <p className="text-3xl font-bold text-white leading-none mb-1 shadow-sm">{analytics.top_property.views.toLocaleString()}</p>
                                    <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Total Views</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deep Insights Widget */}
            <div className="mt-8 bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent_40%)]" />
                <h3 className="font-bold text-gray-900 text-xl tracking-tight flex items-center gap-3 mb-8 border-b border-gray-100/60 pb-6">
                    <Zap className="w-6 h-6 text-amber-500" />
                    Actionable Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/80 transition-colors">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Average Daily Views</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics ? Math.round(analytics.total_views_30d / timeRange).toLocaleString() : 0}
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/80 transition-colors">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Save Rate</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {analytics && analytics.total_views_30d > 0
                                ? ((analytics.total_saves_30d / analytics.total_views_30d) * 100).toFixed(1)
                                : 0}%
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/80 transition-colors">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Inquiry Rate</p>
                        <p className="text-3xl font-bold text-gray-900">
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
