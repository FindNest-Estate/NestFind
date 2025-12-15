"use client";

import { useState, useEffect } from "react";
import { CreditCard, Clock, Download, TrendingUp, Filter, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AgentFinance() {
    const [finance, setFinance] = useState<{ total_earned: number, pending_clearance: number, transactions: any[], revenue_trend: any[], next_payout: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, PENDING

    useEffect(() => {
        const fetchFinance = async () => {
            try {
                const data = await api.dashboard.agentFinance();
                setFinance(data);
            } catch (error) {
                console.error("Failed to fetch finance data", error);
                toast.error("Failed to load finance data");
            } finally {
                setLoading(false);
            }
        };
        fetchFinance();
    }, []);

    const downloadReport = () => {
        // Mock download functionality
        toast.success("Downloading financial report...");
    };

    if (loading) return <div className="text-center py-12">Loading finance data...</div>;
    if (!finance) return <div className="text-center py-12">Failed to load data.</div>;

    const filteredTransactions = finance.transactions.filter(txn => {
        if (filter === 'ALL') return true;
        return txn.status === filter;
    });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                    <p className="text-gray-500">Track your earnings and transactions</p>
                </div>
                <button
                    onClick={downloadReport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Download size={16} />
                    Download Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <TrendingUp size={16} />
                            +15%
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Earnings</p>
                    <h3 className="text-3xl font-bold text-gray-900">₹{finance.total_earned.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Pending Clearance</p>
                    <h3 className="text-3xl font-bold text-gray-900">₹{finance.pending_clearance.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <CreditCard size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Next Payout</p>
                    <h3 className="text-3xl font-bold text-gray-900">{finance.next_payout}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={finance.revenue_trend}>
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
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transactions List */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('ALL')}
                                className={`text-xs font-medium px-2 py-1 rounded ${filter === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('COMPLETED')}
                                className={`text-xs font-medium px-2 py-1 rounded ${filter === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Paid
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">No transactions found</div>
                        ) : (
                            <div className="space-y-1">
                                {filteredTransactions.map((txn) => (
                                    <div key={txn.id} className="p-3 hover:bg-gray-50 rounded-lg transition-colors flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {txn.status === 'COMPLETED' ? <ArrowDownRight size={16} /> : <Clock size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{txn.property_title}</p>
                                                <p className="text-xs text-gray-500">{new Date(txn.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">+₹{txn.amount.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-400">{txn.reference}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-100 text-center">
                        <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All Transactions</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
