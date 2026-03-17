'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    Briefcase,
    Building2,
    Calendar,
    ChevronRight,
    Inbox,
    Loader2,
    MapPin,
    TrendingUp,
    AlertTriangle,
    Activity,
    Bell,
    IndianRupee,
    LayoutDashboard,
    ArrowUpRight,
    RefreshCw,
} from 'lucide-react';
import {
    getAgentAssignments,
    getAgentAnalytics,
    getAgentInsights,
    AssignmentListItem,
    AnalyticsResponse,
    InsightsResponse
} from '@/lib/api/agent';
import { getImageUrl } from '@/lib/api';

/* ──────────────────────────────────────────────────────── */
/*  HELPERS                                                 */
/* ──────────────────────────────────────────────────────── */

function formatPrice(price: number | null): string {
    if (!price) return 'TBD';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatEarnings(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
}

/* ──────────────────────────────────────────────────────── */
/*  STAT CARD                                               */
/* ──────────────────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color, href, subtitle }: {
    label: string;
    value: string | number;
    icon: typeof Building2;
    color: string;
    href?: string;
    subtitle?: string;
}) {
    const content = (
        <div className={`bg-white/90 backdrop-blur-lg rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 ${href ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-md transform rotate-3 group-hover:rotate-0 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            <div className="text-3xl font-black text-gray-900 leading-tight tracking-tight">{value}</div>
            {subtitle && (
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{subtitle}</p>
            )}
            {href && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100/60 text-xs font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                    View details <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
            )}
        </div>
    );
    if (href) return <Link href={href}>{content}</Link>;
    return content;
}

/* ──────────────────────────────────────────────────────── */
/*  MAIN PAGE                                               */
/* ──────────────────────────────────────────────────────── */

export default function AgentDashboardPage() {
    const router = useRouter();
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [insights, setInsights] = useState<InsightsResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [analyticsData, insightsData, assignmentsData] = await Promise.all([
                getAgentAnalytics(),
                getAgentInsights(),
                getAgentAssignments('pending', 1, 5)
            ]);
            setAnalytics(analyticsData);
            setInsights(insightsData);
            setAssignments(assignmentsData.assignments);
        } catch (err) {
            console.error("Dashboard load error", err);
            setError("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const activeAssignments = analytics?.overview.active_assignments || 0;
    const activeDeals = analytics?.overview.active_deals || 0;
    const pendingRequests = analytics?.overview.pending_requests || 0;
    const earnings = analytics?.overview.total_earnings || 0;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        Agent Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">{today}</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </button>
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
                    <button onClick={loadData} className="mt-3 text-xs text-red-500 hover:underline">Try again</button>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Active Assignments"
                            value={activeAssignments}
                            icon={Building2}
                            color="bg-gradient-to-br from-blue-500 to-blue-600"
                            href="/agent/assignments?status=active"
                        />
                        <StatCard
                            label="Ongoing Deals"
                            value={activeDeals}
                            icon={Briefcase}
                            color="bg-gradient-to-br from-violet-500 to-purple-600"
                            href="/agent/transactions"
                        />
                        <StatCard
                            label="Pending Requests"
                            value={pendingRequests}
                            icon={Inbox}
                            color="bg-gradient-to-br from-amber-400 to-orange-500"
                            href="/agent/visits"
                        />
                        <StatCard
                            label="Total Earnings"
                            value={formatEarnings(earnings)}
                            icon={IndianRupee}
                            color="bg-gradient-to-br from-emerald-400 to-teal-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        {/* ── Left Column ── */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Earnings Chart */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100/60 flex items-center justify-between bg-white/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl">
                                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Earnings Overview</h3>
                                    </div>
                                </div>
                                <div className="p-5 h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics?.chart_data || []}>
                                            <defs>
                                                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
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
                                                tickFormatter={(v) => `₹${v / 1000}k`}
                                                width={50}
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
                                                dataKey="earnings"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorEarnings)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Assignments */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100/60 flex items-center justify-between bg-white/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-xl">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Recent Assignments</h3>
                                    </div>
                                    <Link
                                        href="/agent/assignments"
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg"
                                    >
                                        View All <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="divide-y divide-gray-100/60">
                                    {assignments.length > 0 ? assignments.map(a => (
                                        <div
                                            key={a.id}
                                            onClick={() => router.push(`/agent/assignments/${a.id}`)}
                                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-all duration-200 group"
                                        >
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
                                                {a.property.thumbnail_url ? (
                                                    <img src={getImageUrl(a.property.thumbnail_url) || ''} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{a.property.title}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {a.property.city}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="font-bold text-gray-700">{formatPrice(a.property.price)}</span>
                                                </div>
                                            </div>
                                            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${a.status === 'ACCEPTED' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' :
                                                a.status === 'REQUESTED' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' :
                                                    'bg-gray-50 border-gray-200 text-gray-700 shadow-sm'
                                                }`}>
                                                {a.status === 'ACCEPTED' ? 'Active' : a.status === 'REQUESTED' ? 'Pending' : a.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    )) : (
                                        <div className="p-10 text-center text-sm font-medium text-gray-500 bg-gray-50/50">
                                            No active assignments.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Right Column ── */}
                        <div className="space-y-6">
                            {/* Activity Feed */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100/60 flex items-center gap-3 bg-white/50">
                                    <div className="p-2 bg-emerald-50 rounded-xl">
                                        <Activity className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 tracking-tight">Activity Feed</h3>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto">
                                    {insights?.activity_feed && insights.activity_feed.length > 0 ? (
                                        <div className="divide-y divide-gray-100/60">
                                            {insights.activity_feed.map((activity: any, i: number) => (
                                                <div key={i} className="px-6 py-4 hover:bg-gray-50/80 transition-colors">
                                                    <div className="flex gap-3.5">
                                                        <div className="mt-1.5 shrink-0">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 leading-relaxed">{activity.description}</p>
                                                            <p className="text-xs text-gray-400 mt-1.5 font-semibold">
                                                                {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center text-sm font-medium text-gray-400 bg-gray-50/50">No recent activity.</div>
                                    )}
                                </div>
                            </div>

                            {/* Alerts */}
                            {(insights?.insights || []).length > 0 && (
                                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="px-6 py-5 border-b border-rose-100/60 flex items-center gap-3 bg-rose-50/50">
                                        <div className="p-2 bg-rose-100 rounded-xl">
                                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Attention Needed</h3>
                                        <span className="ml-auto px-2.5 py-1 bg-gradient-to-r from-rose-500 to-[#FF385C] text-white text-xs font-bold rounded-lg shadow-sm">
                                            {insights?.insights.length}
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-3 bg-rose-50/30">
                                        {insights?.insights.map((insight: any) => (
                                            <div
                                                key={insight.id}
                                                className="p-4 bg-white border border-rose-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1.5">
                                                    {insight.title}
                                                </h4>
                                                <p className="text-sm text-gray-700 leading-relaxed font-medium">{insight.description}</p>
                                                {insight.actionUrl && (
                                                    <Link
                                                        href={insight.actionUrl}
                                                        className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-gray-900 hover:text-rose-600 transition-colors"
                                                    >
                                                        Take Action <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
