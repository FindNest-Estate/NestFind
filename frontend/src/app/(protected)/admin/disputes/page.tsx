'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, ShieldAlert, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getAllDisputes } from '@/lib/api/disputes';
import { Dispute, DISPUTE_TYPE_LABELS } from '@/lib/types/disputes';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const loadDisputes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllDisputes();
            if (res.success) setDisputes(res.disputes);
        } catch { /* handled */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadDisputes(); }, [loadDisputes]);

    const filtered = disputes.filter(d => {
        const matchesSearch = !search || d.description?.toLowerCase().includes(search.toLowerCase()) || d.raised_by_name?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || d.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = disputes.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Disputes</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">Review and resolve platform disputes</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: disputes.length },
                    { label: 'Open', value: statusCounts['OPEN'] || 0 },
                    { label: 'Under Review', value: statusCounts['UNDER_REVIEW'] || 0 },
                    { label: 'Resolved', value: statusCounts['RESOLVED'] || 0 },
                ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 hover:shadow-[var(--shadow-sm)] transition-shadow">
                        <p className="text-xs font-medium text-[var(--gray-500)]">{kpi.label}</p>
                        <p className="text-xl font-bold text-[var(--gray-900)] mt-0.5">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-3 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                    <input type="text" placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)]" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading disputes...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <ShieldAlert className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No disputes found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Dispute</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Filed By</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {filtered.map((dispute) => (
                                    <tr key={dispute.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                        <td className="px-5 py-3">
                                            <Link href={`/admin/disputes/${dispute.id}`}>
                                                <p className="text-sm font-medium text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">
                                                    {DISPUTE_TYPE_LABELS[dispute.type] || dispute.type}
                                                </p>
                                                <p className="text-[11px] text-[var(--gray-500)] line-clamp-1 mt-0.5">{dispute.description}</p>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="text-xs text-[var(--gray-600)]">{dispute.raised_by_name}</p>
                                            <p className="text-[11px] text-[var(--gray-400)]">{dispute.raised_by_role}</p>
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={dispute.status} /></td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-500)]">
                                            {dispute.created_at ? format(new Date(dispute.created_at), 'MMM d, yyyy') : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={`/admin/disputes/${dispute.id}`}
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
            </div>
        </div>
    );
}
