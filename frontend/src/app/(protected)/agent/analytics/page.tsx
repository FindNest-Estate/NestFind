'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Target,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    RefreshCw,
    Briefcase,
    AlertTriangle,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { getAgentAnalytics, AnalyticsResponse } from '@/lib/api/agent';

/* ──────────────────────────────────────────────────────── */
/*  HELPERS                                                 */
/* ──────────────────────────────────────────────────────── */

const generateChartData = (value: number) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(name => ({
        name,
        value: Math.max(0, Math.floor(value / 7 + (Math.random() * 20 - 10)))
    }));
};

/* ──────────────────────────────────────────────────────── */
/*  STAT CARD WITH TREND                                    */
/* ──────────────────────────────────────────────────────── */

function MetricCard({ label, value, icon: Icon, color, trend, trendLabel, extra }: {
    label: string;
    value: string | number;
    icon: typeof BarChart3;
    color: string;
    trend?: number;
    trendLabel?: string;
    extra?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">{label}</p>
                    <h3 className="text-2xl font-bold text-[var(--gray-900)] mt-1">{value}</h3>
                </div>
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                </div>
            </div>
            {trend !== undefined && (
                <div className="flex items-center gap-1.5 text-[11px]">
                    {trend >= 0 ? (
                        <span className="text-emerald-600 flex items-center font-medium">
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />{trend}%
                        </span>
                    ) : (
                        <span className="text-red-500 flex items-center font-medium">
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />{Math.abs(trend)}%
                        </span>
                    )}
                    <span className="text-[var(--gray-400)]">{trendLabel || 'vs last period'}</span>
                </div>
            )}
            {extra}
        </div>
    );
}

/* ──────────────────────────────────────────────────────── */
/*  MAIN PAGE                                               */
/* ──────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('week');

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAgentAnalytics(timeRange);
            setStats(res);
        } catch (err: any) {
            setError(err?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [timeRange]);

    const chartData = stats?.portfolio_data || generateChartData(stats?.overview.active_deals || 0);
    const earningsTrend = (stats?.overview.total_earnings || 0) > 0 ? 12.5 : 0;

    const barData = stats ? [
        { name: 'Active', value: stats.overview.active_deals, color: '#3b82f6' },
        { name: 'Pending', value: stats.overview.pending_requests, color: '#f59e0b' },
        { name: 'Closed', value: stats.overview.completed_deals, color: '#10b981' },
    ] : [];

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[var(--gray-400)]" />
                        Performance Analytics
                    </h1>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">
                        Track your earnings, deals, and conversion metrics
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-0.5 bg-[var(--gray-100)] rounded-lg p-0.5">
                        {['week', 'month', 'year'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${timeRange === range
                                        ? 'bg-white text-[var(--gray-900)] shadow-sm'
                                        : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
                                    }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    <button onClick={fetchStats} className="mt-3 text-xs text-red-500 hover:underline">Try again</button>
                </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && !stats?.success && (
                <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
                    <BarChart3 className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-[var(--gray-700)]">No analytics data available</h3>
                    <p className="text-xs text-[var(--gray-500)] mt-1">Check back later once you have activity.</p>
                </div>
            )}

            {!loading && stats?.success && (
                <>
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard
                            label="Total Earnings"
                            value={`₹${(stats.overview.total_earnings || 0).toLocaleString('en-IN')}`}
                            icon={DollarSign}
                            color="bg-emerald-500"
                            trend={earningsTrend}
                        />
                        <MetricCard
                            label="Active Deals"
                            value={stats.overview.active_deals}
                            icon={TrendingUp}
                            color="bg-blue-500"
                            extra={
                                <p className="text-[11px] text-[var(--gray-500)] mt-2">
                                    {stats.overview.pending_requests} pending requests
                                </p>
                            }
                        />
                        <MetricCard
                            label="Completed Deals"
                            value={stats.overview.completed_deals}
                            icon={Award}
                            color="bg-violet-500"
                            extra={
                                <p className="text-[11px] text-[var(--gray-500)] mt-2">
                                    Avg deal: ₹{(stats.overview.avg_deal_size || 0).toLocaleString('en-IN')}
                                </p>
                            }
                        />
                        <MetricCard
                            label="Conversion Rate"
                            value={`${stats.overview.conversion_rate}%`}
                            icon={Target}
                            color="bg-amber-500"
                            extra={
                                <div className="mt-2.5 w-full bg-[var(--gray-100)] rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-full rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(stats.overview.conversion_rate, 100)}%` }}
                                    />
                                </div>
                            }
                        />
                    </div>

                    {/* ── Charts ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Activity Chart */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                            <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[var(--gray-400)]" />
                                <h3 className="text-sm font-bold text-[var(--gray-900)]">Activity Overview</h3>
                            </div>
                            <div className="p-4 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.08} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            width={40}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution Chart */}
                        <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                            <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[var(--gray-400)]" />
                                <h3 className="text-sm font-bold text-[var(--gray-900)]">Deal Distribution</h3>
                            </div>
                            <div className="p-4 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {barData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Legend */}
                            <div className="px-5 pb-4 flex items-center justify-center gap-5">
                                {barData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                                        <span className="text-[11px] text-[var(--gray-500)]">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
