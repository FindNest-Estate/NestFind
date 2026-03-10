'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, History, ChevronLeft, ChevronRight, Users, Building2, DollarSign, Shield } from 'lucide-react';
import { getAuditLogs, AuditLogItem, AuditLogResponse } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs({ page, per_page: 30, search: search || undefined, entity_type: entityFilter || undefined });
            if (res) {
                setLogs(res.items || []);
                setTotalPages(res.total_pages || 1);
            }
        } catch { /* handled */ } finally { setLoading(false); }
    }, [page, search, entityFilter]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'user': return <Users className="w-3.5 h-3.5 text-[var(--color-info)]" />;
            case 'property': return <Building2 className="w-3.5 h-3.5 text-[var(--color-success)]" />;
            case 'transaction': return <DollarSign className="w-3.5 h-3.5 text-[var(--color-brand)]" />;
            default: return <Shield className="w-3.5 h-3.5 text-[var(--gray-500)]" />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">Audit Logs</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">System activity and action history</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-3 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--gray-400)]" />
                    <input type="text" placeholder="Search logs..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)]" />
                </div>
                <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Events</option>
                    <option value="user">User</option>
                    <option value="property">Property</option>
                    <option value="transaction">Transaction</option>
                    <option value="agent">Agent</option>
                </select>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-16 text-center">
                        <History className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No audit logs found</p>
                    </div>
                ) : (
                    <div className="p-5">
                        <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--gray-100)]">
                            {logs.map((item) => (
                                <div key={item.id} className="flex gap-3 relative">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 bg-white border border-[var(--gray-200)]">
                                        {getEntityIcon(item.entity_type)}
                                    </div>
                                    <div className="pt-1 min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-[var(--gray-900)]">
                                                <span className="font-semibold">{item.user_name}</span>{' '}
                                                <span className="text-[var(--gray-600)]">{item.action.toLowerCase().replace(/_/g, ' ')}</span>
                                                {item.entity_type && <span className="text-[var(--gray-500)]"> on {item.entity_type}</span>}
                                            </p>
                                            <span className="text-[11px] text-[var(--gray-400)] flex-shrink-0">
                                                {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : ''}
                                            </span>
                                        </div>
                                        {item.details && (
                                            <p className="text-[11px] text-[var(--gray-400)] mt-0.5 line-clamp-1">{item.details}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
