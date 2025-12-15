"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Eye, MousePointerClick, ArrowUpRight, ArrowDownRight, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AgentAnalytics() {
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await api.dashboard.agentAnalytics(timeRange);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="animate-spin text-purple-600" size={48} />
            </div>
        );
    }

    if (!data) return <div className="text-center py-12 text-gray-500">Failed to load analytics data.</div>;

    const { metrics, chart_data, source_data } = data;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Overview</h1>
                    <p className="text-gray-500 mt-1">Deep dive into your property performance and lead generation</p>
                </div>
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                    {['7d', '30d', '90d'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${timeRange === range
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 3 Months'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Views"
                    value={metrics.total_views.toLocaleString()}
                    change="+0%" // We don't have historical comparison yet
                    trend="neutral"
                    icon={Eye}
                    color="blue"
                />
                <MetricCard
                    title="Unique Leads"
                    value={metrics.unique_leads.toLocaleString()}
                    change="+0%"
                    trend="neutral"
                    icon={Users}
                    color="green"
                />
                <MetricCard
                    title="Click Rate"
                    value={`${metrics.click_rate}%`}
                    change="0%"
                    trend="neutral"
                    icon={MousePointerClick}
                    color="purple"
                />
                <MetricCard
                    title="Avg. Time on Page"
                    value={metrics.avg_time}
                    change="-"
                    trend="neutral"
                    icon={Calendar}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart: Views & Leads */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Performance Over Time</h3>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                <span className="text-gray-600">Views</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-gray-600">Leads</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    dy={10}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorViews)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="leads"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorLeads)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Chart: Lead Sources */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Lead Sources</h3>
                    <div className="h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={source_data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {source_data.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-gray-900">100%</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                        </div>
                    </div>
                    <div className="space-y-3 mt-4">
                        {source_data.map((entry: any, index: number) => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}></div>
                                    <span className="text-gray-600">{entry.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">{entry.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Properties */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Performing Properties</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                    <th className="pb-3 font-medium">Property</th>
                                    <th className="pb-3 font-medium text-right">Views</th>
                                    <th className="pb-3 font-medium text-right">Leads</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.top_properties?.map((property: any, index: number) => (
                                    <tr key={index}>
                                        <td className="py-3 text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                            {index + 1}. {property.title}
                                        </td>
                                        <td className="py-3 text-sm text-gray-600 text-right">{property.views}</td>
                                        <td className="py-3 text-sm text-gray-600 text-right">{property.leads}</td>
                                    </tr>
                                ))}
                                {(!data.top_properties || data.top_properties.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-500 text-sm">No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Conversion Funnel</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.funnel_data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="stage"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 14, fontWeight: 500 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={40}>
                                    {data.funnel_data?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, change, trend, icon: Icon, color }: any) {
    const isUp = trend === 'up';
    const isNeutral = trend === 'neutral';
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
                    <Icon size={20} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-green-600' : isNeutral ? 'text-gray-500' : 'text-red-600'}`}>
                    {!isNeutral && (isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />)}
                    {change}
                </span>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    );
}
