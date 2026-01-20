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
    CheckCircle,
    Inbox,
    TrendingUp,
    Briefcase,
    Building2,
    ChevronRight,
    Loader2,
    MapPin,
    Bell,
    Target
} from 'lucide-react';
import {
    getAgentAssignments,
    getAgentAnalytics,
    getAgentInsights,
    AssignmentListItem,
    AnalyticsResponse,
    InsightsResponse
} from '@/lib/api/agent';
import AIInsightsWidget, { AIInsight, generateInsights } from '@/components/agent/AIInsightsWidget';
import QuickActionsFab from '@/components/agent/QuickActionsFab';

/**
 * Agent Dashboard - Enhanced Version
 * 
 * Features:
 * - AI-Powered Insights Widget
 * - Quick Actions FAB
 * - Notification Badge
 * - Performance Goal Tracking
 */

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
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{greeting}, Agent</h1>
                <p className="text-gray-500 mt-1">Here is what is happening in your territory today.</p>
            </div>
            <NotificationBell count={3} />
        </div>
    );
}

function NotificationBell({ count }: { count: number }) {
    const [isOpen, setIsOpen] = useState(false);

    const notifications = [
        { id: 1, title: 'New lead assigned', desc: 'Property in Koramangala', time: '5 min ago', unread: true },
        { id: 2, title: 'Visit scheduled', desc: 'Tomorrow at 10:00 AM', time: '1 hour ago', unread: true },
        { id: 3, title: 'Offer received', desc: '₹1.2 Cr for Modern Villa', time: '2 hours ago', unread: true },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <button className="text-xs text-rose-600 font-medium hover:underline">
                                Mark all read
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${n.unread ? 'bg-rose-50/30' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {n.unread && (
                                            <span className="w-2 h-2 bg-rose-500 rounded-full mt-2 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                                            <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                            <Link
                                href="/agent/notifications"
                                className="block text-center text-sm font-medium text-gray-600 hover:text-rose-600"
                            >
                                View All Notifications
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({ title, value, subtext, icon: Icon, trend, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                    <Icon className="w-6 h-6 text-rose-500" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
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

function GoalProgressCard({ current, target, label }: { current: number; target: number; label: string }) {
    const progress = Math.min((current / target) * 100, 100);

    return (
        <div className="bg-gradient-to-br from-rose-500 to-pink-500 p-6 rounded-2xl text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                    <Target className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold">Monthly Goal</h3>
                    <p className="text-white/80 text-xs">{label}</p>
                </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold">{current}</span>
                <span className="text-white/70 text-lg mb-1">/ {target}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                    className="h-full bg-white rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-white/80 text-xs mt-2">{Math.round(progress)}% complete</p>
        </div>
    );
}

function AssignmentRow({ assignment, onAction }: { assignment: AssignmentListItem, onAction: (a: AssignmentListItem) => void }) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-white/50 transition-colors border-b last:border-0 border-gray-200/50">
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
                    <span className="font-medium text-rose-500">{formatPrice(assignment.property.price)}</span>
                </div>
            </div>
            <div className="text-right">
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${assignment.status === 'REQUESTED' ? 'bg-amber-100 text-amber-800' :
                        assignment.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            'bg-rose-100 text-rose-800'}`}>
                    {assignment.status}
                </div>
                <div className="text-xs text-gray-400 mt-1">{formatDate(assignment.requested_at)}</div>
            </div>
            <button
                onClick={() => onAction(assignment)}
                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}

export default function AgentDashboardPage() {
    const router = useRouter();
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [insights, setInsights] = useState<InsightsResponse | null>(null);
    const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

    // Load Data
    useEffect(() => {
        async function loadData() {
            try {
                const [analyticsData, insightsData, assignmentsData] = await Promise.all([
                    getAgentAnalytics(),
                    getAgentInsights(),
                    getAgentAssignments('pending', 1, 5)
                ]);

                setAnalytics(analyticsData);
                setInsights(insightsData);
                setAssignments(assignmentsData.assignments);

                // Generate enhanced AI insights
                const generatedInsights = generateInsights({
                    pendingLeads: analyticsData?.overview.pending_requests || 0,
                    daysWithoutContact: [
                        { name: 'Rahul Sharma', days: 5 },
                        { name: 'Priya Patel', days: 3 }
                    ],
                    hotProperties: [
                        { title: 'Modern 3BHK in HSR', views: 156 }
                    ],
                    conversionRate: analyticsData?.overview.conversion_rate || 15,
                    avgResponseTime: 2.5
                });

                // Map existing insights to AIInsight format
                const existingInsights: AIInsight[] = (insightsData?.insights || []).map((i: any) => ({
                    id: i.id,
                    type: i.type === 'opportunity' ? 'opportunity' : i.type === 'warning' ? 'warning' : 'tip',
                    title: i.title,
                    description: i.description,
                    action: i.action,
                    priority: 'medium' as const
                }));

                setAiInsights([...generatedInsights, ...existingInsights]);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'lead':
                router.push('/agent/crm');
                break;
            case 'visit':
                router.push('/agent/calendar');
                break;
            case 'call':
                // Could open a call log modal
                console.log('Log call');
                break;
            case 'note':
                // Could open a quick note modal
                console.log('Quick note');
                break;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent space-y-8 animate-fade-in pb-20">
            {/* Header with Notifications */}
            <Greeting />

            {/* Stats Grid with Goal Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                    onClick={() => router.push('/agent/assignments?status=active')}
                />
                <StatCard
                    title="Pending Requests"
                    value={analytics?.overview.pending_requests || 0}
                    subtext="New leads waiting"
                    icon={Inbox}
                    trend={analytics?.overview.pending_requests ? "Action Needed" : null}
                    onClick={() => router.push('/agent/assignments?status=pending')}
                />
                <StatCard
                    title="Closed Deals"
                    value={analytics?.overview.completed_deals || 0}
                    subtext="This month"
                    icon={CheckCircle}
                />
                <GoalProgressCard
                    current={analytics?.overview.completed_deals || 0}
                    target={10}
                    label="Deals to close"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Earnings Chart */}
                <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-sm">
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
                                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
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
                                    stroke="#F43F5E"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEarnings)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar: Enhanced AI Insights */}
                <AIInsightsWidget
                    insights={aiInsights}
                    onActionClick={(insight) => {
                        console.log('Insight action:', insight);
                        if (insight.actionUrl) {
                            router.push(insight.actionUrl);
                        }
                    }}
                />
            </div>

            {/* Recent Requests Section */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Recent Assignments</h2>
                    <Link href="/agent/assignments" className="text-sm font-medium text-rose-600 hover:text-rose-700">
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

            {/* Quick Actions FAB */}
            <QuickActionsFab
                onAddLead={() => router.push('/agent/crm')}
                onScheduleVisit={() => router.push('/agent/calendar')}
                onLogCall={() => console.log('Log call modal')}
                onQuickNote={() => console.log('Quick note modal')}
            />
        </div>
    );
}
