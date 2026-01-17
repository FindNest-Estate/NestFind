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
    RefreshCw
} from 'lucide-react';
import { get } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get full image URL
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
    COMPLETED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Completed' },
    DECLINED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Declined' },
};

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    const fetchAssignments = async (status?: string) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.append('status', status);
            params.append('page', '1');
            params.append('per_page', '20');

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
        fetchAssignments(filter);
    }, [filter]);

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

    const filterTabs: { value: FilterStatus; label: string; count?: number }[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-emerald-600" />
                        Property Assignments
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage your assigned properties and verification tasks
                    </p>
                </div>
                <button
                    onClick={() => fetchAssignments(filter)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {filterTabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === tab.value
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => fetchAssignments(filter)}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : assignments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No assignments found</h3>
                    <p className="text-slate-500 mt-2">
                        {filter === 'all'
                            ? "You don't have any property assignments yet."
                            : `No ${filter} assignments at the moment.`}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {assignments.map((assignment) => {
                        const config = getStatusConfig(assignment.status);
                        const StatusIcon = config.icon;

                        return (
                            <Link
                                key={assignment.id}
                                href={`/agent/assignments/${assignment.id}`}
                                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Property Image */}
                                    <div className="sm:w-48 h-40 sm:h-auto bg-slate-100 flex-shrink-0 overflow-hidden">
                                        <img
                                            src={getImageUrl(assignment.property.thumbnail_url)}
                                            alt={assignment.property.title || 'Property'}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
                                            }}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-4 sm:p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Status Badge */}
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {config.label}
                                                </div>

                                                {/* Property Title */}
                                                <h3 className="mt-2 text-lg font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                                                    {assignment.property.title || 'Untitled Property'}
                                                </h3>

                                                {/* Property Details */}
                                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                    {assignment.property.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" />
                                                            {assignment.property.city}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <IndianRupee className="w-4 h-4" />
                                                        {formatPrice(assignment.property.price)}
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {assignment.property.type || 'Property'}
                                                    </span>
                                                </div>

                                                {/* Seller & Date */}
                                                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                                                    <span>Seller: {assignment.seller.name}</span>
                                                    <span>Assigned: {formatDate(assignment.requested_at)}</span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <span className="text-sm text-slate-500">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </span>
                </div>
            )}
        </div>
    );
}
