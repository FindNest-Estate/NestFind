'use client';

import React, { useEffect, useState } from 'react';
import { get, getImageUrl } from '@/lib/api';
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100/60 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-rose-500 rounded-2xl shadow-sm">
                            <Receipt className="w-6 h-6 text-white" />
                        </div>
                        Transactions
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Track your property sales and earnings</p>
                </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative bg-gradient-to-r from-[#FF385C] via-rose-500 to-orange-500 rounded-3xl p-8 shadow-lg overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shadow-inner border border-white/30">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/90 font-bold uppercase tracking-widest text-[11px] shadow-sm">Net Earnings</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight drop-shadow-sm relative z-10">{formatPrice(summary.net_earnings)}</p>
                    <p className="text-xs text-white/80 font-medium mt-2 relative z-10">From {summary.completed} completed sales</p>
                </div>

                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-blue-50 rounded-xl">
                            <IndianRupee className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Revenue</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{formatPrice(summary.total_revenue)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Before fees</p>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-rose-50 rounded-xl">
                            <Receipt className="w-6 h-6 text-rose-500" />
                        </div>
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Platform Fees</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{formatPrice(summary.total_fees)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Commission + service fee</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-8 mt-8">
                {['ALL', 'INITIATED', 'VERIFIED', 'COMPLETED', 'CANCELLED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${activeFilter === filter
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 shadow-lg -translate-y-0.5 border-transparent'
                            : 'bg-white/90 backdrop-blur-lg text-gray-600 hover:text-gray-900 border border-gray-200/60 hover:border-gray-300 hover:bg-white'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Transactions' : filter.charAt(0) + filter.slice(1).toLowerCase().replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Transactions List */}
            {transactions.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Receipt className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">No transactions yet</h3>
                    <p className="text-gray-500 font-medium max-w-md mx-auto">When your properties are sold, transactions will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map((txn) => {
                        const status = statusConfig[txn.status] || statusConfig.INITIATED;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={txn.id}
                                className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100/60 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-20 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm relative">
                                            {txn.property.thumbnail_url ? (
                                                <img
                                                    src={getImageUrl(txn.property.thumbnail_url) || ''}
                                                    alt={txn.property.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out absolute inset-0"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Home className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg truncate tracking-tight">{txn.property.title}</h3>
                                            <div className="flex items-center gap-2 mt-2 text-sm font-medium text-gray-500">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span>Sold to {txn.buyer.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transaction Details */}
                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="text-left sm:text-center">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sale Price</p>
                                            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatPrice(txn.total_price)}</p>
                                        </div>

                                        <ArrowRight className="w-5 h-5 text-gray-300 hidden md:block" />

                                        <div className="text-left sm:text-center">
                                            <p className="text-[11px] font-bold text-[#ff385c] uppercase tracking-widest mb-1">You Receive</p>
                                            <p className="text-xl font-bold text-[#ff385c] tracking-tight">{formatPrice(txn.seller_receives)}</p>
                                        </div>

                                        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-xl border font-bold text-[11px] uppercase tracking-widest shadow-sm ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`${status.color}`}>{txn.status_display}</span>
                                        </div>

                                        <div className="text-left sm:text-right hidden lg:block">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                                            <p className="text-sm font-bold text-gray-600">{formatDate(txn.created_at)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Breakdown (expanded on hover or for completed) */}
                                {txn.status === 'COMPLETED' && (
                                    <div className="mt-6 pt-6 border-t border-gray-100/60 flex flex-wrap gap-8 text-sm font-medium relative z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold">Platform Fee</span>
                                            <span className="text-gray-900 font-bold">{formatPrice(txn.platform_fee)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold">Agent Commission</span>
                                            <span className="text-gray-900 font-bold">{formatPrice(txn.agent_commission)}</span>
                                        </div>
                                        {txn.completed_at && (
                                            <div className="flex items-center gap-2 lg:ml-auto">
                                                <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold">Completed</span>
                                                <span className="text-gray-600 font-bold">{formatDate(txn.completed_at)}</span>
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
