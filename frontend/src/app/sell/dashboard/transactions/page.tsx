'use client';

import React, { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import {
    Receipt,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    IndianRupee,
    Home,
    User,
    TrendingUp,
    ArrowRight
} from 'lucide-react';

interface PropertyInfo {
    id: string;
    title: string;
    thumbnail_url: string | null;
}

interface BuyerInfo {
    id: string;
    name: string;
    email: string;
}

interface AgentInfo {
    id: string;
    name: string;
}

interface TransactionItem {
    id: string;
    property: PropertyInfo;
    buyer: BuyerInfo;
    agent: AgentInfo | null;
    total_price: number;
    platform_fee: number;
    agent_commission: number;
    seller_receives: number;
    status: string;
    status_display: string;
    created_at: string;
    completed_at: string | null;
}

interface TransactionsResponse {
    success: boolean;
    transactions: TransactionItem[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
    summary: {
        completed: number;
        active: number;
        total_revenue: number;
        total_fees: number;
        net_earnings: number;
    };
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
    INITIATED: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Clock },
    PENDING_VERIFICATION: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
    VERIFIED: { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', icon: CheckCircle },
    COMPLETED: { color: 'text-[#ff385c]', bgColor: 'bg-rose-50 border-rose-200', icon: CheckCircle },
    CANCELLED: { color: 'text-slate-500', bgColor: 'bg-slate-100 border-slate-200', icon: XCircle },
    DISPUTED: { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', icon: AlertTriangle }
};

export default function SellerTransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [summary, setSummary] = useState({ completed: 0, active: 0, total_revenue: 0, total_fees: 0, net_earnings: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    useEffect(() => {
        loadTransactions();
    }, [activeFilter]);

    async function loadTransactions() {
        try {
            setIsLoading(true);
            const params = activeFilter !== 'ALL' ? `?status=${activeFilter}` : '';
            const data = await get<TransactionsResponse>(`/seller/transactions${params}`);
            setTransactions(data.transactions);
            setSummary(data.summary);
        } catch (err) {
            console.error("Failed to load transactions", err);
            setError("Failed to load transactions");
        } finally {
            setIsLoading(false);
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#ff385c] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-7 h-7 text-[#ff385c]" />
                        Transactions
                    </h1>
                    <p className="text-slate-500 mt-1">Track your property sales and earnings</p>
                </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#ff385c] rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-white/90">Net Earnings</span>
                    </div>
                    <p className="text-3xl font-bold">{formatPrice(summary.net_earnings)}</p>
                    <p className="text-sm text-white/80 mt-1">From {summary.completed} completed sales</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <IndianRupee className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-slate-500">Total Revenue</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{formatPrice(summary.total_revenue)}</p>
                    <p className="text-sm text-slate-400 mt-1">Before fees</p>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-slate-500">Platform Fees</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{formatPrice(summary.total_fees)}</p>
                    <p className="text-sm text-slate-400 mt-1">Commission + service fee</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'INITIATED', 'VERIFIED', 'COMPLETED', 'CANCELLED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeFilter === filter
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/50'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Transactions' : filter.charAt(0) + filter.slice(1).toLowerCase().replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Transactions List */}
            {transactions.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">No transactions yet</h3>
                    <p className="text-slate-500 mt-2">When your properties are sold, transactions will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map((txn) => {
                        const status = statusConfig[txn.status] || statusConfig.INITIATED;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={txn.id}
                                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-20 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                                            {txn.property.thumbnail_url ? (
                                                <img
                                                    src={txn.property.thumbnail_url}
                                                    alt={txn.property.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Home className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 truncate">{txn.property.title}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                                <User className="w-3 h-3" />
                                                <span>Sold to {txn.buyer.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transaction Details */}
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400 uppercase">Sale Price</p>
                                            <p className="text-lg font-bold text-slate-800">{formatPrice(txn.total_price)}</p>
                                        </div>

                                        <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block" />

                                        <div className="text-center">
                                            <p className="text-xs text-slate-400 uppercase">You Receive</p>
                                            <p className="text-lg font-bold text-[#ff385c]">{formatPrice(txn.seller_receives)}</p>
                                        </div>

                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`text-sm font-medium ${status.color}`}>{txn.status_display}</span>
                                        </div>

                                        <p className="text-sm text-slate-400">{formatDate(txn.created_at)}</p>
                                    </div>
                                </div>

                                {/* Fee Breakdown (expanded on hover or for completed) */}
                                {txn.status === 'COMPLETED' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6 text-sm">
                                        <div>
                                            <span className="text-slate-400">Platform Fee:</span>
                                            <span className="ml-2 text-slate-600">{formatPrice(txn.platform_fee)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Agent Commission:</span>
                                            <span className="ml-2 text-slate-600">{formatPrice(txn.agent_commission)}</span>
                                        </div>
                                        {txn.completed_at && (
                                            <div>
                                                <span className="text-slate-400">Completed:</span>
                                                <span className="ml-2 text-slate-600">{formatDate(txn.completed_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
