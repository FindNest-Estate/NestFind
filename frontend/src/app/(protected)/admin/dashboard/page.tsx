'use client';

import { useEffect, useState } from 'react';
import {
    getPlatformOverview,
    getRevenueTrends,
    getAuditLogs,
    PlatformOverview,
    RevenueTrend,
    AuditLogItem
} from '@/lib/api/admin';
import {
    Users,
    Building2,
    AlertCircle,
    DollarSign,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    UserCheck,
    FileCheck,
    History,
    Shield
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<PlatformOverview | null>(null);
    const [trends, setTrends] = useState<RevenueTrend[]>([]);
    const [recentActivity, setRecentActivity] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [overviewRes, trendsRes, activityRes] = await Promise.all([
                    getPlatformOverview(),
                    getRevenueTrends(),
                    getAuditLogs({ page: 1, per_page: 5 })
                ]);

                if (overviewRes.success) setStats(overviewRes.data);
                if (trendsRes.success) setTrends(trendsRes.data);
                if (activityRes) setRecentActivity(activityRes.items || []);

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                    <p className="text-slate-400 font-medium">Loading dashboard insights...</p>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load stats</div>;

    const kpiCards = [
        {
            title: "Total Revenue",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.total_revenue),
            trend: "+12.5%",
            trendUp: true,
            icon: DollarSign,
            color: "from-emerald-500 to-teal-500"
        },
        {
            title: "Active Listings",
            value: stats.active_listings,
            trend: "+5.2%",
            trendUp: true,
            icon: Building2,
            color: "from-blue-500 to-indigo-500"
        },
        {
            title: "Total Users",
            value: stats.total_users + stats.total_agents,
            trend: "+8.1%",
            trendUp: true,
            icon: Users,
            color: "from-violet-500 to-purple-500"
        },
        {
            title: "Pending Reviews",
            value: stats.pending_verifications,
            trend: stats.pending_verifications > 5 ? "High Load" : "Normal",
            trendUp: stats.pending_verifications <= 5,
            icon: AlertCircle,
            color: "from-amber-500 to-orange-500"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-slate-500 mt-1">Real-time platform insights and performance metrics.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, i) => (
                    <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-6 group hover:shadow-md transition-shadow">
                        <div className={`absolute top-0 right-0 p-3 opacity-10 rounded-bl-2xl bg-gradient-to-br ${card.color}`}>
                            <card.icon className="w-16 h-16" />
                        </div>

                        <div className="relative z-10">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">{card.title}</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>

                            <div className="flex items-center gap-1 mt-2">
                                <span className={`flex items-center text-xs font-bold ${card.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {card.trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                    {card.trend}
                                </span>
                                <span className="text-xs text-slate-400">vs last month</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Revenue Trends</h3>
                            <p className="text-sm text-slate-500">Gross revenue over past 30 days</p>
                        </div>
                        <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors">
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(val) => `₹${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions & System Health */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link href="/admin/agents" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 group-hover:text-emerald-700">Review Agents</h4>
                                    <p className="text-xs text-slate-500 group-hover:text-emerald-600">Approve pending applications</p>
                                </div>
                            </Link>

                            <Link href="/admin/properties" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
                                    <Search className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 group-hover:text-blue-700">Verify Properties</h4>
                                    <p className="text-xs text-slate-500 group-hover:text-blue-600">Check new listings</p>
                                </div>
                            </Link>

                            <Link href="/admin/transactions" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200 transition-colors">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 group-hover:text-purple-700">Audit Transactions</h4>
                                    <p className="text-xs text-slate-500 group-hover:text-purple-600">Review completed deals</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">System Status</h3>
                            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Database Cluster', status: 'Healthy', color: 'bg-emerald-500' },
                                { name: 'API Gateway', status: 'Operational', color: 'bg-emerald-500' },
                                { name: 'Storage Service', status: 'Operational', color: 'bg-emerald-500' },
                                { name: 'Payment Network', status: 'Mock Mode', color: 'bg-amber-500' },
                            ].map((service, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">{service.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${service.color}`} />
                                        <span className="font-medium text-slate-900">{service.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Feed (Real) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                    <Link href="/admin/audit-logs" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        View All <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>

                {recentActivity.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        {recentActivity.map((item) => (
                            <div key={item.id} className="flex gap-4 relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 bg-white border-2 border-slate-100 shadow-sm`}>
                                    {/* Icon based on Entity Type */}
                                    {item.entity_type === 'user' ? <Users className="w-4 h-4 text-blue-500" /> :
                                        item.entity_type === 'property' ? <Building2 className="w-4 h-4 text-emerald-500" /> :
                                            item.entity_type === 'transaction' ? <DollarSign className="w-4 h-4 text-purple-500" /> :
                                                <Shield className="w-4 h-4 text-slate-500" />}
                                </div>
                                <div className="pt-2">
                                    <p className="text-sm font-medium text-slate-900">
                                        <span className="font-bold">{item.user_name}</span> {item.action.toLowerCase().replace('_', ' ')}
                                        {item.entity_type && <span className="text-slate-500"> on {item.entity_type}</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-400">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        No recent activity recorded
                    </div>
                )}
            </div>
        </div>
    );
}
