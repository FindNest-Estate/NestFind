'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ClipboardList,
    Building2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    MapPin,
    IndianRupee,
    Filter,
    RefreshCw,
    ChevronLeft
} from 'lucide-react';
import { get } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getImageUrl = (url: string | null): string => {
    if (!url) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

interface Assignment {
    id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
    property: {
        id: string;
        title: string | null;
        type: string | null;
        price: number | null;
        city: string | null;
        status: string;
        thumbnail_url: string | null;
    };
    seller: {
        name: string;
        email: string;
    };
}

interface AssignmentsResponse {
    assignments: Assignment[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
        has_more: boolean;
    };
}

type FilterStatus = 'all' | 'pending' | 'active' | 'completed';

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
    REQUESTED: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
    ACCEPTED: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2, label: 'Active' },
    COMPLETED: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', icon: CheckCircle2, label: 'Completed' },
    DECLINED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Declined' },
};

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    const fetchAssignments = async (status?: string, page: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.append('status', status);
            params.append('page', page.toString());
            params.append('per_page', '10');

            const response = await get<AssignmentsResponse>(`/agent/assignments?${params.toString()}`);
            setAssignments(response.assignments || []);
            setPagination({
                page: response.pagination?.page || 1,
                total: response.pagination?.total || 0,
                totalPages: response.pagination?.total_pages || 1,
            });
        } catch (err: any) {
            console.error('Failed to fetch assignments:', err);
            setError(err.message || 'Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments(filter, 1);
    }, [filter]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchAssignments(filter, newPage);
        }
    };

    const formatPrice = (price: number | null) => {
        if (!price) return 'Price TBD';
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
        if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
        return `₹${price.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || { color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle, label: status };
    };

    const filterTabs: { value: FilterStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-rose-600" />
                        Property Assignments
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage your assigned properties and verification tasks
                    </p>
                </div>
                <button
                    onClick={() => fetchAssignments(filter, pagination.page)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-1">
                <div className="flex gap-6 overflow-x-auto pb-2 sm:pb-0">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${filter === tab.value
                                ? 'border-rose-500 text-rose-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="hidden sm:block text-xs text-gray-400">
                    Showing {assignments.length} of {pagination.total} assignments
                </div>
            </div>

            {/* Content */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-600"></div>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-500">{error}</p>
                        <button
                            onClick={() => fetchAssignments(filter, pagination.page)}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="p-16 text-center">
                        <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
                        <p className="text-gray-500 mt-2">
                            {filter === 'all'
                                ? "You don't have any property assignments yet."
                                : `No ${filter} assignments at the moment.`}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Property</th>
                                        <th className="px-6 py-4 font-medium">Seller</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Assigned</th>
                                        <th className="px-6 py-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {assignments.map((assignment) => {
                                        const config = getStatusConfig(assignment.status);
                                        const StatusIcon = config.icon;
                                        return (
                                            <tr key={assignment.id} className="hover:bg-white/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={getImageUrl(assignment.property.thumbnail_url)}
                                                            className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                                                            alt=""
                                                        />
                                                        <div>
                                                            <div className="font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={assignment.property.title || ''}>
                                                                {assignment.property.title || 'Untitled'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {assignment.property.city}</span>
                                                                <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" /> {formatPrice(assignment.property.price)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{assignment.seller.name}</div>
                                                    <div className="text-xs text-gray-500">{assignment.seller.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {formatDate(assignment.requested_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/agent/assignments/${assignment.id}`}
                                                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {assignments.map((assignment) => {
                                const config = getStatusConfig(assignment.status);
                                return (
                                    <Link key={assignment.id} href={`/agent/assignments/${assignment.id}`} className="block p-4 hover:bg-white/50">
                                        <div className="flex items-center gap-4 mb-3">
                                            <img
                                                src={getImageUrl(assignment.property.thumbnail_url)}
                                                className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                                                alt=""
                                            />
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 line-clamp-1">{assignment.property.title || 'Untitled'}</div>
                                                <div className="text-sm text-gray-500 mt-0.5">{assignment.property.city} • {formatPrice(assignment.property.price)}</div>
                                                <span className={`inline-flex mt-2 items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${config.bg} ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <span>Seller: {assignment.seller.name}</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Pagination Footer */}
                        {pagination.totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 font-medium">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
