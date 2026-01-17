'use client';

import { useState, useEffect } from 'react';
import {
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    AlertCircle,
    ChevronRight,
    Building2,
    User,
    DollarSign,
    FileText
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

interface Transaction {
    id: string;
    property_id: string;
    property_title: string;
    property_city: string;
    buyer_name: string;
    seller_name: string;
    total_price: number;
    commission: number;
    registration_date?: string;
    registration_location?: string;
    status: string;
    display_status: string;
    allowed_actions: string[];
}

interface TransactionsResponse {
    success: boolean;
    transactions: Transaction[];
    pagination: {
        page: number;
        total: number;
        total_pages: number;
    };
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
    INITIATED: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    SLOT_BOOKED: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Calendar },
    BUYER_VERIFIED: { color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: User },
    SELLER_VERIFIED: { color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', icon: User },
    ALL_VERIFIED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    SELLER_PAID: { color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: DollarSign },
    DOCUMENTS_PENDING: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: FileText },
    ADMIN_REVIEW: { color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', icon: FileText },
    COMPLETED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
};

export default function AgentTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    useEffect(() => {
        fetchTransactions();
    }, [activeTab]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const statusFilter = activeTab === 'active' ? '' : 'COMPLETED';
            const response = await get<TransactionsResponse>(`/transactions?role=agent&status=${statusFilter}`);
            setTransactions(response.transactions || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const getConfig = (status: string) => {
        return statusConfig[status] || { color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-emerald-600" />
                        Transactions
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage property registrations and closings
                    </p>
                </div>
                <button
                    onClick={fetchTransactions}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'active'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    Active
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    Completed
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600">{error}</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No transactions</h3>
                    <p className="text-slate-500 mt-2">
                        {activeTab === 'active'
                            ? "No active transactions at the moment."
                            : "No completed transactions yet."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {transactions.map((transaction) => {
                        const config = getConfig(transaction.status);
                        const StatusIcon = config.icon;

                        return (
                            <Link
                                key={transaction.id}
                                href={`/agent/transactions/${transaction.id}`}
                                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        {/* Status */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {transaction.display_status}
                                        </div>

                                        {/* Property */}
                                        <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-emerald-600">
                                            {transaction.property_title}
                                        </h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                            <MapPin className="w-4 h-4" />
                                            {transaction.property_city}
                                        </p>

                                        {/* Parties */}
                                        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                                            <span>Buyer: <strong className="text-slate-700">{transaction.buyer_name}</strong></span>
                                            <span>Seller: <strong className="text-slate-700">{transaction.seller_name}</strong></span>
                                        </div>

                                        {/* Price & Date */}
                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                            <span className="text-emerald-600 font-bold">
                                                {formatCurrency(transaction.total_price)}
                                            </span>
                                            {transaction.registration_date && (
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(transaction.registration_date), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
