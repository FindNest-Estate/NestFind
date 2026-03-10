'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Search, Users, ChevronLeft, ChevronRight, ArrowUpRight, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { getAdminUsers, suspendUser, activateUser, AdminUser, AdminUserStats, AdminUsersResponse } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminUserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminUsers({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, per_page: 20 });
            if (res.success) {
                setUsers(res.users);
                setStats(res.stats);
                setTotalPages(res.pagination?.total_pages || 1);
            }
        } catch { /* handled */ } finally { setLoading(false); }
    }, [search, roleFilter, statusFilter, page]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleSuspend = async (userId: string) => {
        setActionLoading(userId);
        try { await suspendUser(userId); loadUsers(); } catch { /* handled */ } finally { setActionLoading(null); }
    };
    const handleActivate = async (userId: string) => {
        setActionLoading(userId);
        try { await activateUser(userId); loadUsers(); } catch { /* handled */ } finally { setActionLoading(null); }
    };

    const kpis = stats ? [
        { label: 'Active', value: stats.active, color: 'var(--color-success)' },
        { label: 'Suspended', value: stats.suspended, color: 'var(--color-error)' },
        { label: 'Users', value: stats.users, color: 'var(--color-info)' },
        { label: 'Agents', value: stats.agents, color: '#8b5cf6' },
    ] : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--gray-900)]">User Management</h1>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">View, manage, and moderate platform users</p>
            </div>

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
                    <input type="text" placeholder="Search users..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)]" />
                </div>
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Roles</option>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none cursor-pointer">
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">User</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Role</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Joined</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                        <td className="px-5 py-3">
                                            <Link href={`/admin/users/${user.id}`}>
                                                <p className="text-sm font-medium text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">{user.full_name}</p>
                                                <p className="text-[11px] text-[var(--gray-500)]">{user.email}</p>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={user.role.toUpperCase()} /></td>
                                        <td className="px-5 py-3"><StatusBadge status={user.status} /></td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-500)]">
                                            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {user.role !== 'admin' && (
                                                    user.status === 'ACTIVE' ? (
                                                        <button onClick={() => handleSuspend(user.id)} disabled={actionLoading === user.id}
                                                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-[var(--radius-sm)] transition-colors">
                                                            {actionLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleActivate(user.id)} disabled={actionLoading === user.id}
                                                            className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-[var(--radius-sm)] transition-colors">
                                                            {actionLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                                        </button>
                                                    )
                                                )}
                                                <Link href={`/admin/users/${user.id}`}
                                                    className="text-[var(--gray-400)] hover:text-[var(--color-brand)]">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </Link>
                                            </div>
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
