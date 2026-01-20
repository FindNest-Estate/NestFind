'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, User, Search, Filter, Calendar, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getAuditLogs, AuditLogItem } from '@/lib/api/admin';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        user_id: '',
        page: 1,
        per_page: 20
    });
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 1
    });

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await getAuditLogs({
                page: filters.page,
                per_page: filters.per_page,
                action: filters.action || undefined,
                user_id: filters.user_id || undefined
            });
            setLogs(res.items);
            setPagination({
                total: res.total,
                pages: res.pages
            });
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filters.page, filters.action, filters.user_id]); // Fetch when filters/page change

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-emerald-600" />
                        Audit Logs
                    </h1>
                    <p className="text-gray-500">Track system activity and administrator actions</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filter by Action (e.g. USER_LOGIN)"
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
                    />
                </div>
                {/* User ID Filter (Optional) */}
                <div className="min-w-[200px] relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filter by User UUID"
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={filters.user_id}
                        onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value, page: 1 }))}
                    />
                </div>

                <button
                    onClick={() => fetchLogs()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                    {log.user_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{log.user_name}</div>
                                                    <div className="text-xs text-gray-500">{log.user_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {log.entity_type} {log.entity_id && <span className="text-xs text-gray-400">#{log.entity_id.slice(0, 8)}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.details ? (
                                                <div className="group relative">
                                                    <Code className="w-4 h-4 text-gray-400 cursor-help" />
                                                    <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs p-2 rounded shadow-xl hidden group-hover:block z-50 overflow-hidden break-words font-mono">
                                                        {log.details}
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing page <span className="font-medium">{filters.page}</span> of <span className="font-medium">{pagination.pages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={filters.page === 1}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                            disabled={filters.page >= pagination.pages}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
