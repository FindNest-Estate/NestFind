'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    User,
    Building2,
    Loader2,
    Filter
} from 'lucide-react';
import { get } from '@/lib/api';
import { format } from 'date-fns';

interface Transaction {
    id: string;
    property_title: string;
    buyer_name: string;
    seller_name: string;
    amount: number;
    status: string;
    created_at: string;
}

interface TransactionStats {
    total_volume: number;
    completed_count: number;
    pending_count: number;
    failed_count: number;
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

interface TransactionsResponse {
    success: boolean;
    transactions: Transaction[];
    stats: TransactionStats;
    pagination: Pagination;
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    const fetchTransactions = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);

            const response = await get<TransactionsResponse>(`/admin/transactions?${params.toString()}`);
            if (response.success) {
                setTransactions(response.transactions);
                setStats(response.stats);
                setPagination(response.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'COMPLETED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
            'FAILED': 'bg-red-100 text-red-700 border-red-200',
            'CANCELLED': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                    <p className="text-slate-500">Monitor financial activities and payments</p>
                </div>
                <button
                    onClick={() => fetchTransactions(pagination.page)}
                    disabled={loading}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total Volume</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(stats.total_volume)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Completed</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.completed_count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.pending_count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <XCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Failed</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.failed_count}</p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, property, or names..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions(1)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                        <option value="">All Status</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <button
                        onClick={() => fetchTransactions(1)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-200"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entities</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                                        <p className="text-slate-400 mt-2 text-sm">Loading transactions...</p>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No transactions found</h3>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-500">#{tx.id.slice(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-slate-900">{tx.property_title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-sm">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <User className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Buyer</span>
                                                    <span>{tx.buyer_name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <User className="w-3 h-3 text-blue-500" />
                                                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Seller</span>
                                                    <span>{tx.seller_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(tx.status)}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/transactions/${tx.id}`}
                                                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Details <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{transactions.length}</span> of <span className="font-medium">{pagination.total}</span> transactions
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchTransactions(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => fetchTransactions(pagination.page + 1)}
                            disabled={pagination.page >= pagination.total_pages}
                            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
