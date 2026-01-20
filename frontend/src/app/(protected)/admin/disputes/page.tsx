'use client';

import { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ShieldAlert,
    Gavel,
    Check
} from "lucide-react";
import Link from "next/link";
import { getDisputes } from "@/lib/api/disputes";
import { Dispute, DisputeStatus } from "@/lib/types/dispute";

interface DisputeStats {
    total: number;
    open: number;
    under_review: number;
    resolved: number;
}

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [stats, setStats] = useState<DisputeStats>({ total: 0, open: 0, under_review: 0, resolved: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);

    const fetchDisputes = useCallback(async () => {
        setIsLoading(true);
        try {
            // Note: In a real app, we would pass params to the API. 
            // For now, we'll fetch all and filter client-side as per current API implementation
            const data = await getDisputes();

            // Calculate stats
            const newStats = {
                total: data.disputes.length,
                open: data.disputes.filter(d => d.status === DisputeStatus.OPEN).length,
                under_review: data.disputes.filter(d => d.status === DisputeStatus.UNDER_REVIEW).length,
                resolved: data.disputes.filter(d => d.status === DisputeStatus.RESOLVED).length
            };
            setStats(newStats);
            setDisputes(data.disputes);
        } catch (error) {
            console.error("Failed to fetch disputes", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDisputes();
    }, [fetchDisputes]);

    // Client-side filtering
    const filteredDisputes = disputes.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
            d.id.includes(search) ||
            d.raised_by?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter ? d.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: DisputeStatus) => {
        switch (status) {
            case DisputeStatus.OPEN:
                return 'bg-red-100 text-red-700 border-red-200';
            case DisputeStatus.UNDER_REVIEW:
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case DisputeStatus.RESOLVED:
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dispute Management</h1>
                    <p className="text-slate-500">Review and resolve user reported issues</p>
                </div>
                <button
                    onClick={fetchDisputes}
                    disabled={isLoading}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Total Disputes</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Open</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <Gavel className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Under Review</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.under_review}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <Check className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Resolved</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, title, or user..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                        <option value="">All Status</option>
                        <option value={DisputeStatus.OPEN}>Open</option>
                        <option value={DisputeStatus.UNDER_REVIEW}>Under Review</option>
                        <option value={DisputeStatus.RESOLVED}>Resolved</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispute ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Raised By</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                                        <p className="text-slate-400 mt-2 text-sm">Loading disputes...</p>
                                    </td>
                                </tr>
                            ) : filteredDisputes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ShieldAlert className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No disputes found</h3>
                                    </td>
                                </tr>
                            ) : (
                                filteredDisputes.map(dispute => (
                                    <tr key={dispute.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-500">#{dispute.id.slice(0, 8)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {dispute.category.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {dispute.title}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {dispute.raised_by?.full_name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(dispute.status as DisputeStatus)}`}>
                                                {dispute.status === DisputeStatus.OPEN && <AlertCircle className="w-3 h-3" />}
                                                {dispute.status === DisputeStatus.UNDER_REVIEW && <Clock className="w-3 h-3" />}
                                                {dispute.status === DisputeStatus.RESOLVED && <CheckCircle className="w-3 h-3" />}
                                                {dispute.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/disputes/${dispute.id}`}
                                                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Review <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{filteredDisputes.length}</span> disputes
                    </p>
                </div>
            </div>
        </div>
    );
}
