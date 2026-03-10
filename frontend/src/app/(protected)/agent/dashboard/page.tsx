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
        <div className={`bg-white rounded-xl border border-[var(--gray-200)] p-5 hover:shadow-md transition-all group ${href ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
            </div>
            <div className="text-2xl font-bold text-[var(--gray-900)] leading-tight">{value}</div>
            {subtitle && (
                <p className="text-[11px] text-[var(--gray-400)] mt-1">{subtitle}</p>
            )}
            {href && (
                <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-[var(--gray-400)] group-hover:text-[var(--color-brand)] transition-colors">
                    View details <ArrowUpRight className="w-3 h-3" />
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
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[var(--gray-400)]" />
                        Dashboard
                    </h1>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">{today}</p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard
                            label="Active Assignments"
                            value={activeAssignments}
                            icon={Building2}
                            color="bg-blue-500"
                            href="/agent/assignments?status=active"
                        />
                        <StatCard
                            label="Ongoing Deals"
                            value={activeDeals}
                            icon={Briefcase}
                            color="bg-violet-500"
                            href="/agent/transactions"
                        />
                        <StatCard
                            label="Pending Requests"
                            value={pendingRequests}
                            icon={Inbox}
                            color="bg-amber-500"
                            href="/agent/visits"
                        />
                        <StatCard
                            label="Total Earnings"
                            value={formatEarnings(earnings)}
                            icon={IndianRupee}
                            color="bg-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* ── Left Column ── */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Earnings Chart */}
                            <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-[var(--gray-400)]" />
                                        <h3 className="text-sm font-bold text-[var(--gray-900)]">Earnings Overview</h3>
                                    </div>
                                </div>
                                <div className="p-4 h-[280px]">
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
                            <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-[var(--gray-400)]" />
                                        <h3 className="text-sm font-bold text-[var(--gray-900)]">Recent Assignments</h3>
                                    </div>
                                    <Link
                                        href="/agent/assignments"
                                        className="text-[11px] font-medium text-[var(--gray-500)] hover:text-[var(--color-brand)] transition-colors flex items-center gap-1"
                                    >
                                        View All <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                <div className="divide-y divide-[var(--gray-100)]">
                                    {assignments.length > 0 ? assignments.map(a => (
                                        <div
                                            key={a.id}
                                            onClick={() => router.push(`/agent/assignments/${a.id}`)}
                                            className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--gray-50)] cursor-pointer transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-[var(--gray-100)] rounded-lg overflow-hidden shrink-0 border border-[var(--gray-200)]">
                                                {a.property.thumbnail_url ? (
                                                    <img src={getImageUrl(a.property.thumbnail_url) || ''} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[var(--gray-400)]">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[var(--gray-900)] truncate">{a.property.title}</p>
                                                <div className="flex items-center gap-2 text-[11px] text-[var(--gray-500)] mt-0.5">
                                                    <span className="flex items-center gap-0.5">
                                                        <MapPin className="w-3 h-3" /> {a.property.city}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-[var(--gray-700)]">{formatPrice(a.property.price)}</span>
                                                </div>
                                            </div>
                                            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${a.status === 'ACCEPTED' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                                a.status === 'REQUESTED' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                                    'bg-[var(--gray-100)] border-[var(--gray-200)] text-[var(--gray-600)]'
                                                }`}>
                                                {a.status === 'ACCEPTED' ? 'Active' : a.status === 'REQUESTED' ? 'Pending' : a.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-[var(--gray-300)] group-hover:text-[var(--gray-500)] transition-colors" />
                                        </div>
                                    )) : (
                                        <div className="p-8 text-center text-xs text-[var(--gray-500)]">
                                            No active assignments.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Right Column ── */}
                        <div className="space-y-5">
                            {/* Activity Feed */}
                            <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                                <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-[var(--gray-400)]" />
                                    <h3 className="text-sm font-bold text-[var(--gray-900)]">Activity Feed</h3>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto">
                                    {insights?.activity_feed && insights.activity_feed.length > 0 ? (
                                        <div className="divide-y divide-[var(--gray-100)]">
                                            {insights.activity_feed.map((activity: any, i: number) => (
                                                <div key={i} className="px-5 py-3 hover:bg-[var(--gray-50)] transition-colors">
                                                    <div className="flex gap-2.5">
                                                        <div className="mt-1.5 shrink-0">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-[var(--gray-700)] leading-relaxed">{activity.description}</p>
                                                            <p className="text-[10px] text-[var(--gray-400)] mt-1 font-medium">
                                                                {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-xs text-[var(--gray-400)]">No recent activity.</div>
                                    )}
                                </div>
                            </div>

                            {/* Alerts */}
                            {(insights?.insights || []).length > 0 && (
                                <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
                                    <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-amber-500" />
                                        <h3 className="text-sm font-bold text-[var(--gray-900)]">Attention Needed</h3>
                                        <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                            {insights?.insights.length}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {insights?.insights.map((insight: any) => (
                                            <div
                                                key={insight.id}
                                                className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                            >
                                                <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">
                                                    {insight.title}
                                                </h4>
                                                <p className="text-xs text-[var(--gray-700)] leading-relaxed">{insight.description}</p>
                                                {insight.actionUrl && (
                                                    <Link
                                                        href={insight.actionUrl}
                                                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[var(--gray-900)] hover:text-[var(--color-brand)] transition-colors"
                                                    >
                                                        Take Action <ArrowUpRight className="w-3 h-3" />
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
