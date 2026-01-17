'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Loader2,
    ChevronRight,
    DollarSign,
    Building2,
    Eye
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

interface Transaction {
    id: string;
    property_title: string;
    property_city: string;
    buyer_name: string;
    seller_name: string;
    agent_name: string;
    total_price: number;
    agent_commission: number;
    status: string;
    display_status: string;
    created_at: string;
}

interface TransactionsResponse {
    success: boolean;
    transactions: Transaction[];
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');

    useEffect(() => {
        loadTransactions();
    }, [filter]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const status = filter === 'pending' ? 'ADMIN_REVIEW' : '';
            const response = await get<TransactionsResponse>(`/admin/transactions?status=${status}`);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ADMIN_REVIEW': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transaction Review</h1>
                    <p className="text-slate-500 mt-1">Verify documents and approve transactions</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                >
                    Pending Review
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                >
                    All Transactions
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600">{error}</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No pending transactions</h3>
                    <p className="text-slate-500 mt-2">All transactions have been reviewed.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {transactions.map((transaction) => (
                        <Link
                            key={transaction.id}
                            href={`/admin/transactions/${transaction.id}`}
                            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Status */}
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                                        {transaction.status === 'ADMIN_REVIEW' ? (
                                            <Clock className="w-3.5 h-3.5" />
                                        ) : (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        {transaction.display_status}
                                    </span>

                                    {/* Property */}
                                    <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-amber-600">
                                        {transaction.property_title}
                                    </h3>
                                    <p className="text-sm text-slate-500">{transaction.property_city}</p>

                                    {/* Parties */}
                                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400">Buyer</p>
                                            <p className="font-medium text-slate-700">{transaction.buyer_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Seller</p>
                                            <p className="font-medium text-slate-700">{transaction.seller_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Agent</p>
                                            <p className="font-medium text-slate-700">{transaction.agent_name}</p>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="mt-3 flex items-center gap-4 text-sm">
                                        <span className="text-emerald-600 font-bold">
                                            {formatCurrency(transaction.total_price)}
                                        </span>
                                        <span className="text-slate-400">
                                            Agent: {formatCurrency(transaction.agent_commission)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">
                                        {format(new Date(transaction.created_at), 'MMM d')}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-600" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
