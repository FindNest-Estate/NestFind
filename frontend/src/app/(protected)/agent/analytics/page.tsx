'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import {
    BarChart3,
    Users,
    Eye,
    Home,
    TrendingUp,
    Award,
    Calendar,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Download
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import AchievementsWidget from '@/components/agent/AchievementsWidget';
import Leaderboard from '@/components/agent/Leaderboard';

interface AgentPortfolioStats {
    active_listings: number;
    total_properties: number;
    total_views: number;
    total_visits: number;
    deals_closed: number;
    conversion_rate: number;
}

// Mock trend data
const weeklyData = [
    { day: 'Mon', views: 45, visits: 12, deals: 2 },
    { day: 'Tue', views: 52, visits: 15, deals: 0 },
    { day: 'Wed', views: 38, visits: 8, deals: 1 },
    { day: 'Thu', views: 65, visits: 22, deals: 3 },
    { day: 'Fri', views: 48, visits: 18, deals: 1 },
    { day: 'Sat', views: 78, visits: 25, deals: 2 },
    { day: 'Sun', views: 35, visits: 10, deals: 0 },
];

const monthlyGoals = [
    { name: 'Deals Closed', current: 8, target: 10, color: '#10B981' },
    { name: 'Property Visits', current: 45, target: 50, color: '#6366F1' },
    { name: 'New Leads', current: 22, target: 30, color: '#F59E0B' },
    { name: 'Client Calls', current: 38, target: 40, color: '#EC4899' },
];

function StatCard({ title, value, change, changeType, icon: Icon, color }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down';
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {change && (
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${changeType === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {change}
                    </span>
                )}
            </div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
    );
}

function GoalProgress({ goal }: { goal: typeof monthlyGoals[0] }) {
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    return (
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{goal.name}</span>
                    <span className="text-sm font-bold text-gray-900">{goal.current}/{goal.target}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: goal.color }}
                    />
                </div>
            </div>
            <span className="text-xs font-bold text-gray-500 w-12 text-right">{Math.round(progress)}%</span>
        </div>
    );
}

export default function AgentAnalyticsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AgentPortfolioStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');

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

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load analytics</div>;

    const funnel = [
        { label: "Total Views", value: stats.total_views, icon: Eye, color: "bg-blue-100 text-blue-700" },
        { label: "Visits Scheduled", value: stats.total_visits, icon: Users, color: "bg-indigo-100 text-indigo-700" },
        { label: "Deals Closed", value: stats.deals_closed, icon: Award, color: "bg-emerald-100 text-emerald-700" },
    ];

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
                    <p className="text-gray-500 mt-1">Track your progress and achievements, {user?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['week', 'month', 'quarter'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Listings"
                    value={stats.active_listings}
                    change="+2"
                    changeType="up"
                    icon={Home}
                    color="bg-orange-100 text-orange-700"
                />
                <StatCard
                    title="Total Views"
                    value={stats.total_views}
                    change="+15%"
                    changeType="up"
                    icon={Eye}
                    color="bg-blue-100 text-blue-700"
                />
                <StatCard
                    title="Property Visits"
                    value={stats.total_visits}
                    change="+8%"
                    changeType="up"
                    icon={Calendar}
                    color="bg-purple-100 text-purple-700"
                />
                <StatCard
                    title="Conversion Rate"
                    value={`${stats.conversion_rate}%`}
                    change="-2%"
                    changeType="down"
                    icon={TrendingUp}
                    color="bg-emerald-100 text-emerald-700"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Trend */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Weekly Activity</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyData}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="views" stroke="#6366F1" strokeWidth={2} fill="url(#colorViews)" />
                                <Area type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-3 h-3 rounded-full bg-indigo-500" /> Views
                        </span>
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Visits
                        </span>
                    </div>
                </div>

                {/* Monthly Goals */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Monthly Goals</h3>
                        <Target className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="space-y-5">
                        {monthlyGoals.map((goal, i) => (
                            <GoalProgress key={i} goal={goal} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Funnel & Gamification */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conversion Funnel */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Conversion Funnel</h3>
                    <div className="space-y-6">
                        {funnel.map((step, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${step.color}`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500">{step.label}</p>
                                    <p className="text-xl font-bold text-gray-900">{step.value}</p>
                                </div>
                                {i < funnel.length - 1 && (
                                    <span className="text-xs text-gray-400">
                                        →
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Overall Conversion</span>
                            <span className="text-lg font-bold text-emerald-600">{stats.conversion_rate}%</span>
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="lg:col-span-1">
                    <AchievementsWidget />
                </div>

                {/* Leaderboard */}
                <div className="lg:col-span-1">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}
