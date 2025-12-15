'use client';

import { useEffect, useState } from 'react';
import AgentLayout from '@/components/dashboard/AgentLayout';
import { api } from '@/lib/api';
import {
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    Download,
    Calendar,
    ArrowUpRight,
    Wallet
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

export default function AgentEarningsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFinance = async () => {
            try {
                const res = await api.dashboard.agentFinance();
                setData(res);
            } catch (error) {
                console.error("Failed to fetch earnings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFinance();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <AgentLayout title="Earnings & Payouts">
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </AgentLayout>
        );
    }

    if (!data) return null;

    return (
        <AgentLayout title="Earnings & Payouts">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
                    <p className="text-gray-500">Track your commissions, payouts, and pending clearances.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Earned */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-indigo-100 mb-2">
                                <CheckCircle size={18} />
                                <span className="font-medium text-sm">Total Payouts (Disbursed)</span>
                            </div>
                            <h3 className="text-4xl font-bold mb-1">{formatCurrency(data.total_earned)}</h3>
                            <p className="text-indigo-100 text-sm opacity-90">Lifetime earnings processed</p>
                        </div>
                    </div>

                    {/* Pending Clearance */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                                    <Clock size={18} />
                                    <span className="font-medium text-sm">Pending Clearance</span>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(data.pending_clearance)}</h3>
                                <p className="text-gray-500 text-sm">Expected processing by Admin</p>
                            </div>
                            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                                <Clock size={24} />
                            </div>
                        </div>
                        {data.pending_clearance > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span>Next Batch Payout:</span>
                                <span className="font-medium text-gray-900">{data.next_payout}</span>
                            </div>
                        )}
                    </div>

                    {/* Projected (Mock) or Monthly Average */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="font-medium text-sm">Revenue Trend</span>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-1 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                                    +12.5%
                                </h3>
                                <p className="text-gray-500 text-sm">Growth vs last month</p>
                            </div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <ArrowUpRight size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Earnings History (6 Months)</h3>
                        <select className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            <option>Last 6 Months</option>
                            <option>Last 12 Months</option>
                            <option>YTD</option>
                        </select>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenue_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    tickFormatter={(val) => `₹${val / 1000}k`}
                                />
                                <Tooltip
                                    formatter={(value: any) => [formatCurrency(value), "Earnings"]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorAmount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Payouts Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">Recent Payouts</h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                            <Download size={16} />
                            Export Statement
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Reference ID</th>
                                    <th className="px-6 py-4">Property</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                            No payouts received yet.
                                        </td>
                                    </tr>
                                ) : (
                                    data.transactions.map((txn: any) => (
                                        <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                                {txn.reference}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {txn.property_title}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(txn.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={12} className="mr-1" />
                                                    PAID
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                {formatCurrency(txn.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.transactions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center">
                            <button className="text-sm text-gray-500 hover:text-gray-900 font-medium">
                                View Previous Transactions
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AgentLayout>
    );
}
