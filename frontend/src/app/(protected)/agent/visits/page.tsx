'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MapPin,
    Calendar,
    ChevronRight,
    RefreshCw,
    User,
    Building2,
    Search,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import { get, getImageUrl } from '@/lib/api';

/* ──────────────────────────────────────────────────────── */
/*  HELPERS & CONSTANTS                                     */
/* ──────────────────────────────────────────────────────── */


function formatDate(dateString: string) {
    const raw = new Date(dateString);
    const date = raw.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
    const time = raw.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
    return { date, time, raw };
}

function getStatusDetails(status: string) {
    const s = status.toUpperCase();
    switch (s) {
        case 'REQUESTED': return {
            color: 'text-amber-700 bg-amber-50 border-amber-200',
            icon: Clock,
            label: 'Pending'
        };
        case 'COUNTERED': return {
            color: 'text-orange-700 bg-orange-50 border-orange-200',
            icon: AlertCircle,
            label: 'Countered'
        };
        case 'APPROVED': return {
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            icon: CheckCircle2,
            label: 'Approved'
        };
        case 'CHECKED_IN': return {
            color: 'text-blue-700 bg-blue-50 border-blue-200',
            icon: MapPin,
            label: 'Checked In'
        };
        case 'COMPLETED': return {
            color: 'text-[var(--gray-700)] bg-[var(--gray-100)] border-[var(--gray-200)]',
            icon: CheckCircle2,
            label: 'Completed'
        };
        case 'REJECTED': return {
            color: 'text-red-700 bg-red-50 border-red-200',
            icon: XCircle,
            label: 'Rejected'
        };
        case 'NO_SHOW': return {
            color: 'text-red-700 bg-red-50 border-red-200',
            icon: XCircle,
            label: 'No Show'
        };
        case 'CANCELLED': return {
            color: 'text-[var(--gray-600)] bg-[var(--gray-100)] border-[var(--gray-200)]',
            icon: XCircle,
            label: 'Cancelled'
        };
        default: return {
            color: 'text-[var(--gray-600)] bg-[var(--gray-100)] border-[var(--gray-200)]',
            icon: AlertCircle,
            label: status
        };
    }
}

type TabType = 'pending' | 'upcoming' | 'completed';

const tabs: { value: TabType; label: string }[] = [
    { value: 'pending', label: 'Pending Requests' },
    { value: 'upcoming', label: 'Upcoming Visits' },
    { value: 'completed', label: 'Past Visits' },
];

/* ──────────────────────────────────────────────────────── */
/*  TYPES                                                   */
/* ──────────────────────────────────────────────────────── */

interface Visit {
    id: string;
    status: string;
    preferred_date: string;
    confirmed_date: string | null;
    buyer_message: string | null;
    created_at: string;
    property_id: string;
    property_title: string;
    property_city: string;
    thumbnail_url: string | null;
    buyer_id: string;
    buyer_name: string | null;
    buyer_email: string | null;
}

interface VisitsResponse {
    visits: Visit[];
    pagination: {
        page: number;
        total: number;
        total_pages: number;
    };
}

/* ──────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                          */
/* ──────────────────────────────────────────────────────── */

export default function AgentVisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    const getStatusFilter = (tab: TabType): string => {
        switch (tab) {
            case 'pending': return 'REQUESTED,COUNTERED';
            case 'upcoming': return 'APPROVED,CHECKED_IN';
            case 'completed': return 'COMPLETED,REJECTED,CANCELLED,NO_SHOW';
            default: return '';
        }
    };

    const fetchVisits = async (page: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const status = getStatusFilter(activeTab);
            const response = await get<VisitsResponse>(`/visits?status=${status}&role=agent&page=${page}&per_page=10`);
            setVisits(response.visits || []);
            setPagination({
                page: response.pagination?.page || 1,
                total: response.pagination?.total || 0,
                totalPages: response.pagination?.total_pages || 1
            });
        } catch (err: any) {
            console.error('Failed to fetch visits:', err);
            setError(err.message || 'Failed to load visits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVisits(1); }, [activeTab]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchVisits(newPage);
        }
    };

    const filteredVisits = visits.filter(v => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (v.property_title?.toLowerCase() || '').includes(q) ||
            (v.buyer_name?.toLowerCase() || '').includes(q);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <Users className="w-5 h-5 text-[var(--gray-400)]" />
                        Visits & Showings
                    </h1>
                    <p className="text-[13px] text-[var(--gray-500)] mt-0.5">
                        Manage property visit requests and your schedule
                    </p>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 p-1 bg-[var(--gray-100)] rounded-lg self-start overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${activeTab === tab.value
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
                            placeholder="Search properties or buyers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-[240px] pl-9 pr-4 py-1.5 text-xs bg-white border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] outline-none transition-all placeholder:text-[var(--gray-400)]"
                        />
                    </div>
                    <button
                        onClick={() => fetchVisits(pagination.page)}
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
                            onClick={() => fetchVisits(pagination.page)}
                            className="mt-4 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredVisits.length === 0 ? (
                    <div className="p-20 text-center">
                        <Calendar className="w-12 h-12 text-[var(--gray-200)] mx-auto mb-4" />
                        <h3 className="text-[15px] font-semibold text-[var(--gray-900)]">No visits found</h3>
                        <p className="text-[13px] text-[var(--gray-500)] mt-1">
                            {searchQuery ? "No results match your search." : `No ${activeTab} visits at the moment.`}
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
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Buyer</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Time & Date</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px]">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-[var(--gray-600)] uppercase tracking-wider text-[11px] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--gray-100)]">
                                    {filteredVisits.map((v) => {
                                        const config = getStatusDetails(v.status);
                                        const StatusIcon = config.icon;
                                        const timeDisplay = formatDate(v.confirmed_date || v.preferred_date);
                                        return (
                                            <tr key={v.id} className="hover:bg-[var(--gray-50)] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)] border border-[var(--gray-200)]">
                                                            <img
                                                                src={getImageUrl(v.thumbnail_url) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-[var(--gray-900)] max-w-[200px] truncate" title={v.property_title}>
                                                                {v.property_title}
                                                            </div>
                                                            <div className="text-[11px] text-[var(--gray-500)] mt-0.5 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-[var(--gray-400)]" />
                                                                {v.property_city}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-[var(--gray-900)]">{v.buyer_name || 'Guest User'}</div>
                                                    <div className="text-[11px] text-[var(--gray-500)] mt-0.5 truncate max-w-[150px]" title={v.buyer_email || ''}>
                                                        {v.buyer_email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[13px] font-semibold text-[var(--gray-900)]">{timeDisplay.time}</span>
                                                        <span className="text-[11px] text-[var(--gray-500)] flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {timeDisplay.date}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[10px] uppercase font-bold tracking-wider border ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/agent/visits/${v.id}`}
                                                        className="inline-flex items-center justify-center p-1.5 text-[var(--gray-400)] hover:text-[var(--color-brand)] bg-transparent hover:bg-[var(--gray-100)] rounded-md transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile View ── */}
                        <div className="md:hidden divide-y divide-[var(--gray-100)]">
                            {filteredVisits.map((v) => {
                                const config = getStatusDetails(v.status);
                                const timeDisplay = formatDate(v.confirmed_date || v.preferred_date);
                                return (
                                    <Link key={v.id} href={`/agent/visits/${v.id}`} className="block p-4 hover:bg-[var(--gray-50)] transition-colors active:bg-[var(--gray-100)]">
                                        <div className="flex gap-3 mb-3">
                                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)] border border-[var(--gray-200)]">
                                                <img src={getImageUrl(v.thumbnail_url) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-[13px] text-[var(--gray-900)] line-clamp-1">
                                                    {v.property_title}
                                                </div>
                                                <div className="text-[12px] text-[var(--gray-500)] mt-0.5">
                                                    {v.buyer_name || 'Guest User'}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-[var(--gray-500)] pt-3 border-t border-[var(--gray-100)]">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-[var(--gray-400)]" />
                                                <span className="font-semibold text-[var(--gray-700)] mr-1">{timeDisplay.time}</span>
                                                {timeDisplay.date}
                                            </span>
                                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                        </div>
                                    </Link>
                                );
                            })}
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
