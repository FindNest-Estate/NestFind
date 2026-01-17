'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
    Clock,
    CheckCircle,
    XCircle,
    Home,
    MapPin,
    User,
    Loader2,
    AlertCircle,
    RefreshCw,
    Building2,
    Inbox,
    ShieldCheck,
    TrendingUp,
    Users,
    Zap,
    Briefcase,
    Calendar,
    ChevronRight,
    Search
} from 'lucide-react';
import {
    getAgentAssignments,
    getAgentAnalytics,
    getAgentInsights,
    acceptAssignment,
    declineAssignment,
    AssignmentListItem,
    AnalyticsResponse,
    InsightsResponse
} from '@/lib/api/agent';

/**
 * Premium Agent Dashboard
 * 
 * Features:
 * - Glassmorphism UI
 * - Real-time Analytics
 * - AI Insights
 * - Assignment Management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatPrice(price: number | null): string {
    if (!price) return 'TBD';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
}

function Greeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return (
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{greeting}, Agent</h1>
            <p className="text-gray-500 mt-1">Here is what is happening in your territory today.</p>
        </div>
    );
}

function StatCard({ title, value, subtext, icon: Icon, trend }: any) {
    return (
        <div className="bg-white/70 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <Icon className="w-6 h-6 text-emerald-600" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
            <p className="text-gray-400 text-xs mt-2">{subtext}</p>
        </div>
    );
}

function InsightCard({ insight }: { insight: any }) {
    const colors = {
        opportunity: 'bg-indigo-50 border-indigo-100 text-indigo-700',
        warning: 'bg-amber-50 border-amber-100 text-amber-700',
        info: 'bg-blue-50 border-blue-100 text-blue-700'
    };

    // Default to info if type is unknown
    const style = colors[insight.type as keyof typeof colors] || colors.info;

    return (
        <div className={`p-4 rounded-xl border mb-3 last:mb-0 ${style} transition-all hover:scale-[1.01]`}>
            <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                    <p className="text-sm opacity-90 mb-2">{insight.description}</p>
                    <button className="text-xs font-bold uppercase tracking-wide opacity-75 hover:opacity-100 transition-opacity">
                        {insight.action} →
                    </button>
                </div>
            </div>
        </div>
    );
}

function AssignmentRow({ assignment, onAction }: { assignment: AssignmentListItem, onAction: (a: AssignmentListItem) => void }) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100">
            <img
                src={assignment.property.thumbnail_url || '/placeholder-house.jpg'}
                alt="Prop"
                className="w-16 h-16 rounded-lg object-cover bg-gray-200"
            />
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{assignment.property.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{assignment.property.city}</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">{formatPrice(assignment.property.price)}</span>
                </div>
            </div>
            <div className="text-right">
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${assignment.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                        assignment.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'}`}>
                    {assignment.status}
                </div>
                <div className="text-xs text-gray-400 mt-1">{formatDate(assignment.requested_at)}</div>
            </div>
            <button
                onClick={() => onAction(assignment)}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}

export default function AgentDashboardPage() {
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [insights, setInsights] = useState<InsightsResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load Data
    useEffect(() => {
        async function loadData() {
            try {
                const [analyticsData, insightsData, assignmentsData] = await Promise.all([
                    getAgentAnalytics(),
                    getAgentInsights(),
                    getAgentAssignments('pending', 1, 5) // Fetch top 5 pending
                ]);

                setAnalytics(analyticsData);
                setInsights(insightsData);
                setAssignments(assignmentsData.assignments);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <Greeting />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Earnings"
                    value={`₹${(analytics?.overview.total_earnings || 0).toLocaleString()}`}
                    subtext="Updated just now"
                    icon={Briefcase}
                    trend="+12%"
                />
                <StatCard
                    title="Active Deals"
                    value={analytics?.overview.active_deals || 0}
                    subtext="Properties in progress"
                    icon={Building2}
                />
                <StatCard
                    title="Pending Requests"
                    value={analytics?.overview.pending_requests || 0}
                    subtext="New leads waiting"
                    icon={Inbox}
                    trend={analytics?.overview.pending_requests ? "Action Needed" : null}
                />
                <StatCard
                    title="Closed Deals"
                    value={analytics?.overview.completed_deals || 0}
                    subtext="This month"
                    icon={CheckCircle}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Earnings Chart */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Earnings Overview</h2>
                        <select className="bg-gray-50 border-none text-sm font-medium text-gray-500 rounded-lg py-1 px-3 focus:ring-0">
                            <option>Last 6 Months</option>
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.chart_data || []}>
                                <defs>
                                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="earnings"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEarnings)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar: AI Insights */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-sm h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Zap className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {insights?.insights.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                        {insights?.insights.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">No new insights today.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Requests Section */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Recent Assignments</h2>
                    <Link href="/agent/assignments" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                        View All
                    </Link>
                </div>

                <div className="divide-y divide-gray-100">
                    {assignments.map(assignment => (
                        <AssignmentRow
                            key={assignment.id}
                            assignment={assignment}
                            onAction={() => window.location.href = `/agent/assignments/${assignment.id}`}
                        />
                    ))}
                    {assignments.length === 0 && (
                        <div className="text-center py-12">
                            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No pending assignments at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
