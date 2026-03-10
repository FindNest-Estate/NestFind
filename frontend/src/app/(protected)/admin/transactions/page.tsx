'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, FileText, ChevronLeft, ChevronRight, ArrowUpRight, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getAdminTransactions, AdminTransaction, AdminTransactionsResponse } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminTransactions({ search: search || undefined, status: statusFilter || undefined, page, per_page: 20 });
            if (res.success) {
                setTransactions(res.transactions);
                setTotalPages(res.pagination?.total_pages || 1);
                setTotal(res.pagination?.total || 0);
            }
        } catch { /* handled */ } finally { setLoading(false); }
    }, [search, statusFilter, page]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Transactions</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">Audit and manage platform transactions</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-3 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                    <input type="text" placeholder="Search transactions..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)]" />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="py-16 text-center">
                        <DollarSign className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No transactions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Property</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Buyer</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {transactions.map((txn) => (
                                    <tr key={txn.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                        <td className="px-5 py-3">
                                            <Link href={`/admin/transactions/${txn.id}`}>
                                                <p className="text-sm font-medium text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">{txn.property_title}</p>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{txn.buyer_name}</td>
                                        <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--gray-900)]">{fmt(txn.total_price)}</td>
                                        <td className="px-5 py-3"><StatusBadge status={txn.display_status || txn.status} /></td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-500)]">
                                            {txn.created_at ? format(new Date(txn.created_at), 'MMM d, yyyy') : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={`/admin/transactions/${txn.id}`}
                                                className="text-[var(--gray-400)] hover:text-[var(--color-brand)]">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-[var(--gray-100)] flex items-center justify-between text-xs text-[var(--gray-500)]">
                        <span>Page {page} of {totalPages} ({total} transactions)</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
