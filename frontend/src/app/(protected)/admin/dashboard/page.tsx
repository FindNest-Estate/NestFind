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
    IndianRupee,
    ArrowUpRight,
    ArrowDownRight,
    UserCheck,
    Search,
    FileCheck,
    History,
    Shield,
    Activity,
    DollarSign,
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
                <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent" />
                    <p className="text-sm text-[var(--gray-400)]">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-center text-[var(--color-error)]">Failed to load stats</div>;

    const kpiCards = [
        {
            title: "Total Revenue",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.total_revenue),
            trend: "+12.5%", trendUp: true, icon: IndianRupee,
        },
        {
            title: "Active Listings",
            value: stats.active_listings,
            trend: "+5.2%", trendUp: true, icon: Building2,
        },
        {
            title: "Total Users",
            value: stats.total_users + stats.total_agents,
            trend: "+8.1%", trendUp: true, icon: Users,
        },
        {
            title: "Pending Reviews",
            value: stats.pending_verifications,
            trend: stats.pending_verifications > 5 ? "High Load" : "Normal",
            trendUp: stats.pending_verifications <= 5,
            icon: AlertCircle,
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Dashboard Overview</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">Real-time platform insights and performance metrics.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <div key={i} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 hover:shadow-[var(--shadow-sm)] transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] flex items-center justify-center">
                                <card.icon className="w-5 h-5 text-[var(--color-brand)]" />
                            </div>
                            <span className={`flex items-center text-xs font-semibold ${card.trendUp ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                                {card.trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {card.trend}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-[var(--gray-500)]">{card.title}</p>
                        <h3 className="text-xl font-bold text-[var(--gray-900)] mt-0.5">{card.value}</h3>
                    </div>
                ))}
            </div>

            {/* Charts + Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--gray-900)]">Revenue Trends</h3>
                            <p className="text-xs text-[var(--gray-500)]">Gross revenue over past 30 days</p>
                        </div>
                        <select className="text-xs border border-[var(--gray-200)] bg-[var(--gray-50)] rounded-[var(--radius-sm)] px-2 py-1 text-[var(--gray-600)]">
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF385C" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#FF385C" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={(val) => `₹${val / 1000}k`} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: '12px' }}
                                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke="#FF385C" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions + System Health */}
                <div className="space-y-4">
                    <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                        <h3 className="text-sm font-bold text-[var(--gray-900)] mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            {[
                                { href: '/admin/agents', label: 'Review Agents', desc: 'Approve pending applications', icon: UserCheck },
                                { href: '/admin/properties', label: 'Verify Properties', desc: 'Check new listings', icon: Search },
                                { href: '/admin/transactions', label: 'Audit Transactions', desc: 'Review completed deals', icon: FileCheck },
                            ].map(action => (
                                <Link key={action.href} href={action.href}
                                    className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--gray-100)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)] transition-colors group">
                                    <div className="p-1.5 bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] text-[var(--color-brand)]">
                                        <action.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-[var(--gray-900)]">{action.label}</h4>
                                        <p className="text-[11px] text-[var(--gray-500)]">{action.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-[var(--gray-900)]">System Status</h3>
                            <Activity className="w-4 h-4 text-[var(--color-success)] animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: 'Database Cluster', status: 'Healthy', ok: true },
                                { name: 'API Gateway', status: 'Operational', ok: true },
                                { name: 'Storage Service', status: 'Operational', ok: true },
                                { name: 'Payment Network', status: 'Mock Mode', ok: false },
                            ].map((service, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--gray-600)]">{service.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${service.ok ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`} />
                                        <span className="font-medium text-[var(--gray-900)]">{service.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[var(--gray-900)]">Recent Activity</h3>
                    <Link href="/admin/audit-logs" className="text-xs font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] flex items-center gap-1">
                        View All <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>

                {recentActivity.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--gray-100)]">
                        {recentActivity.map((item) => (
                            <div key={item.id} className="flex gap-3 relative">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 bg-white border border-[var(--gray-200)]">
                                    {item.entity_type === 'user' ? <Users className="w-3.5 h-3.5 text-[var(--color-info)]" /> :
                                        item.entity_type === 'property' ? <Building2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> :
                                            item.entity_type === 'transaction' ? <DollarSign className="w-3.5 h-3.5 text-[var(--color-brand)]" /> :
                                                <Shield className="w-3.5 h-3.5 text-[var(--gray-500)]" />}
                                </div>
                                <div className="pt-1">
                                    <p className="text-xs text-[var(--gray-900)]">
                                        <span className="font-semibold">{item.user_name}</span> {item.action.toLowerCase().replace('_', ' ')}
                                        {item.entity_type && <span className="text-[var(--gray-500)]"> on {item.entity_type}</span>}
                                    </p>
                                    <p className="text-[11px] text-[var(--gray-400)] mt-0.5">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-[var(--gray-400)]">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No recent activity recorded</p>
                    </div>
                )}
            </div>
        </div>
    );
}
