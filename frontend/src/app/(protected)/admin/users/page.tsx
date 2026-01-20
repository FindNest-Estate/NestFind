'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search,
    Users,
    UserCheck,
    UserX,
    Shield,
    Loader2,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    MoreVertical,
    CheckCircle,
    Eye,
    XCircle,
    AlertCircle,
    Download
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    property_count: number;
    purchase_count: number;
}

interface Stats {
    active: number;
    suspended: number;
    users: number;
    agents: number;
    admins: number;
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

interface UsersResponse {
    success: boolean;
    users: User[];
    stats: Stats;
    pagination: Pagination;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            if (search) params.set('search', search);
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);

            const response = await get<UsersResponse>(`/admin/users?${params.toString()}`);
            if (response.success) {
                setUsers(response.users);
                setStats(response.stats);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load users' });
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSuspend = async (userId: string) => {
        setActionLoading(userId);
        try {
            const response = await post(`/admin/users/${userId}/suspend`, {});
            if (response.success) {
                setMessage({ type: 'success', text: response.message });
                fetchUsers(pagination.page);
            } else {
                throw new Error(response.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to suspend user' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleActivate = async (userId: string) => {
        setActionLoading(userId);
        try {
            const response = await post(`/admin/users/${userId}/activate`, {});
            if (response.success) {
                setMessage({ type: 'success', text: response.message });
                fetchUsers(pagination.page);
            } else {
                throw new Error(response.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to activate user' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleExport = () => {
        const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined', 'Properties', 'Orders'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u.id,
                `"${u.full_name}"`,
                u.email,
                u.role,
                u.status,
                u.created_at,
                u.property_count,
                u.purchase_count
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getRoleBadge = (role: string) => {
        const badges: Record<string, string> = {
            'admin': 'bg-red-100 text-red-700 border-red-200',
            'agent': 'bg-purple-100 text-purple-700 border-purple-200',
            'user': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return badges[role] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            'ACTIVE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'SUSPENDED': 'bg-red-100 text-red-700 border-red-200',
            'PENDING': 'bg-amber-100 text-amber-700 border-amber-200'
        };
        return badges[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage all platform users, roles, and access controls</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchUsers(pagination.page)}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={loading || users.length === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>


            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Users className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total Users</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.active + stats.suspended}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Active Users</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Shield className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Agents</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.agents}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <UserX className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Suspended</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.suspended}</p>
                    </div>
                </div>
            )}

            {/* Message Alert */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filter Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                        <option value="">All Roles</option>
                        <option value="user">Users</option>
                        <option value="agent">Agents</option>
                        <option value="admin">Admins</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                                        <p className="text-slate-400 mt-2 text-sm">Loading users...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No users found</h3>
                                        <p className="text-slate-500 mt-1">Try adjusting your filters or search query</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center border border-emerald-100/50">
                                                    <span className="text-emerald-700 font-bold">
                                                        {user.full_name?.charAt(0).toUpperCase() || '?'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(user.status)}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    <span className="text-slate-600">{user.property_count} properties</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                    <span className="text-slate-600">{user.purchase_count} orders</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {user.role !== 'admin' && (
                                                    user.status === 'ACTIVE' ? (
                                                        <button
                                                            onClick={() => handleSuspend(user.id)}
                                                            disabled={actionLoading === user.id}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                            title="Suspend User"
                                                        >
                                                            {actionLoading === user.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <UserX className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleActivate(user.id)}
                                                            disabled={actionLoading === user.id}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                                            title="Activate User"
                                                        >
                                                            {actionLoading === user.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <UserCheck className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )
                                                )}
                                                <Link
                                                    href={`/admin/users/${user.id}`}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </div>
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
                        Showing <span className="font-medium">{users.length}</span> of <span className="font-medium">{pagination.total}</span> users
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchUsers(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => fetchUsers(pagination.page + 1)}
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
