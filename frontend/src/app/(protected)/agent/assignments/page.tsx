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
    Filter,
    RefreshCw,
    ChevronLeft,
    Search,
    Loader2
} from 'lucide-react';
import { get, getImageUrl } from '@/lib/api';

/* ──────────────────────────────────────────────────────── */
/*  HELPERS & CONSTANTS                                     */
/* ──────────────────────────────────────────────────────── */


function formatPrice(price: number | null): string {
    if (!price) return 'TBD';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function getStatusStyles(status: string) {
    switch (status) {
        case 'REQUESTED': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'ACCEPTED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'COMPLETED': return 'bg-[var(--gray-100)] text-[var(--gray-700)] border-[var(--gray-200)]';
        case 'DECLINED': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-[var(--gray-100)] text-[var(--gray-600)] border-[var(--gray-200)]';
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'REQUESTED': return 'Pending';
        case 'ACCEPTED': return 'Active';
        case 'COMPLETED': return 'Completed';
        case 'DECLINED': return 'Declined';
        default: return status;
    }
}

type FilterStatus = 'all' | 'pending' | 'active' | 'completed';

const filterTabs: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All Assignments' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
];

/* ──────────────────────────────────────────────────────── */
/*  TYPES                                                   */
/* ──────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                          */
/* ──────────────────────────────────────────────────────── */

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    const fetchAssignments = async (status?: string, page: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.append('status', status.toUpperCase());
            params.append('page', page.toString());
            params.append('per_page', '10'); // Can increase if needed

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

    useEffect(() => { fetchAssignments(filter, 1); }, [filter]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchAssignments(filter, newPage);
        }
    };

    const filteredAssignments = assignments.filter(a => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (a.property.title?.toLowerCase() || '').includes(q) ||
            (a.seller.name?.toLowerCase() || '').includes(q);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[var(--gray-400)]" />
                        Property Assignments
                    </h1>
                    <p className="text-[13px] text-[var(--gray-500)] mt-0.5">
                        Manage your assigned properties and verification tasks
                    </p>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 p-1 bg-[var(--gray-100)] rounded-lg self-start overflow-x-auto">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${filter === tab.value
                                ? 'bg-white text-[var(--gray-900)] shadow-sm'
                                : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gray-400)]" />
                        <input
                            type="text"
                            placeholder="Search properties or sellers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-[240px] pl-9 pr-4 py-1.5 text-xs bg-white border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] outline-none transition-all placeholder:text-[var(--gray-400)]"
                        />
                    </div>
                    <button
                        onClick={() => fetchAssignments(filter, pagination.page)}
                        disabled={loading}
                        className="flex items-center justify-center w-8 h-8 bg-white border border-[var(--gray-200)] rounded-lg text-[var(--gray-500)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)] transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="bg-white rounded-xl border border-[var(--gray-200)] shadow-sm overflow-hidden">
                {/* ── Loading / Error ── */}
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-300)]" />
                    </div>
                ) : error ? (
                    <div className="p-16 text-center">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-red-600">{error}</p>
                        <button
                            onClick={() => fetchAssignments(filter, pagination.page)}
                            className="mt-4 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredAssignments.length === 0 ? (
                    <div className="p-20 text-center">
                        <Building2 className="w-12 h-12 text-[var(--gray-200)] mx-auto mb-4" />
                        <h3 className="text-[15px] font-semibold text-[var(--gray-900)]">No assignments found</h3>
                        <p className="text-[13px] text-[var(--gray-500)] mt-1">
                            {searchQuery ? "No results match your search." : (
                                filter === 'all'
                                    ? "You don't have any property assignments yet."
                                    : `No ${filter} assignments at the moment.`
                            )}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop Table ── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-[13px]">
                                <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Property</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Seller</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Assigned Date</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--gray-100)]">
                                    {filteredAssignments.map((a) => (
                                        <tr key={a.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)] border border-[var(--gray-200)]">
                                                        <img
                                                            src={getImageUrl(a.property.thumbnail_url) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--gray-900)] max-w-[220px] truncate" title={a.property.title || ''}>
                                                            {a.property.title || 'Untitled Property'}
                                                        </div>
                                                        <div className="text-[11px] text-[var(--gray-500)] mt-0.5 flex items-center gap-2">
                                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.property.city}</span>
                                                            <span className="font-medium text-[var(--gray-600)]">{formatPrice(a.property.price)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-[var(--gray-900)]">{a.seller.name}</div>
                                                <div className="text-[11px] text-[var(--gray-500)] mt-0.5">{a.seller.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(a.status)}`}>
                                                    {getStatusLabel(a.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-[var(--gray-700)]">
                                                    <Clock className="w-3.5 h-3.5 text-[var(--gray-400)]" />
                                                    {formatDate(a.requested_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/agent/assignments/${a.id}`}
                                                    className="inline-flex items-center justify-center p-1.5 text-[var(--gray-400)] hover:text-[var(--color-brand)] bg-transparent hover:bg-[var(--gray-100)] rounded-md transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile View ── */}
                        <div className="md:hidden divide-y divide-[var(--gray-100)]">
                            {filteredAssignments.map((a) => (
                                <Link key={a.id} href={`/agent/assignments/${a.id}`} className="block p-4 hover:bg-[var(--gray-50)] transition-colors active:bg-[var(--gray-100)]">
                                    <div className="flex gap-3 mb-3">
                                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)] border border-[var(--gray-200)]">
                                            <img src={getImageUrl(a.property.thumbnail_url) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-[13px] text-[var(--gray-900)] line-clamp-1">
                                                {a.property.title || 'Untitled Property'}
                                            </div>
                                            <div className="text-[12px] text-[var(--gray-500)] mt-0.5">
                                                {a.property.city} • {formatPrice(a.property.price)}
                                            </div>
                                            <div className="mt-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border ${getStatusStyles(a.status)}`}>
                                                    {getStatusLabel(a.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-[var(--gray-500)] pt-3 border-t border-[var(--gray-100)]">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-[8px] font-bold text-[var(--gray-600)]">
                                                {a.seller.name.charAt(0)}
                                            </div>
                                            {a.seller.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {formatDate(a.requested_at)}
                                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* ── Pagination ── */}
                        {pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-[var(--gray-200)] flex items-center justify-between bg-[var(--gray-50)]">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 bg-white border border-[var(--gray-200)] rounded-md text-[var(--gray-600)] hover:bg-[var(--gray-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-[var(--gray-600)] font-medium">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-1.5 bg-white border border-[var(--gray-200)] rounded-md text-[var(--gray-600)] hover:bg-[var(--gray-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
