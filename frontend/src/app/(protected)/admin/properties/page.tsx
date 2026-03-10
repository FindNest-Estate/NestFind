'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Search, Building2, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getAdminProperties, AdminProperty, AdminPropertyStats, AdminPropertiesResponse } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';

const fmt = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString('en-IN')}`;
};

export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<AdminProperty[]>([]);
    const [stats, setStats] = useState<AdminPropertyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadProperties = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminProperties({ search: search || undefined, status: statusFilter || undefined, page, per_page: 20 });
            if (res.success) {
                setProperties(res.properties);
                setStats(res.stats);
                setTotalPages(res.pagination?.total_pages || 1);
            }
        } catch { /* handled */ } finally { setLoading(false); }
    }, [search, statusFilter, page]);

    useEffect(() => { loadProperties(); }, [loadProperties]);

    const kpis = stats ? [
        { label: 'Total', value: stats.total, color: 'var(--color-brand)' },
        { label: 'Active', value: stats.active, color: 'var(--color-success)' },
        { label: 'Pending', value: stats.pending, color: 'var(--color-warning)' },
        { label: 'Sold', value: stats.sold, color: '#8b5cf6' },
    ] : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Properties</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">Manage and verify platform listings</p>
            </div>

            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 hover:shadow-[var(--shadow-sm)] transition-shadow">
                            <p className="text-xs font-medium text-[var(--gray-500)]">{kpi.label}</p>
                            <p className="text-xl font-bold text-[var(--gray-900)] mt-0.5">{kpi.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-3 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                    <input type="text" placeholder="Search properties..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)]" />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING_VERIFICATION">Pending</option>
                    <option value="SOLD">Sold</option>
                    <option value="DRAFT">Draft</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading properties...</p>
                    </div>
                ) : properties.length === 0 ? (
                    <div className="py-16 text-center">
                        <Building2 className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No properties found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Property</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Type</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Price</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {properties.map((prop) => (
                                    <tr key={prop.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                        <td className="px-5 py-3">
                                            <Link href={`/admin/properties/${prop.id}`} className="hover:text-[var(--color-brand)]">
                                                <p className="text-sm font-medium text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">{prop.title}</p>
                                                <p className="text-[11px] text-[var(--gray-500)]">{prop.city}{prop.bedrooms ? ` • ${prop.bedrooms} BHK` : ''}</p>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{prop.property_type}</td>
                                        <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--gray-900)]">{fmt(prop.price)}</td>
                                        <td className="px-5 py-3"><StatusBadge status={prop.status} /></td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={`/admin/properties/${prop.id}`}
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
                        <span>Page {page} of {totalPages}</span>
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
