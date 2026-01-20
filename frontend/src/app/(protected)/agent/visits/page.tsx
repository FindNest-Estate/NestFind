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
    ChevronLeft
} from 'lucide-react';
import { get } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

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

type TabType = 'pending' | 'upcoming' | 'completed';

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
    REQUESTED: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
    COUNTERED: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle, label: 'Countered' },
    APPROVED: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', icon: CheckCircle2, label: 'Approved' },
    CHECKED_IN: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', icon: CheckCircle2, label: 'Checked In' },
    COMPLETED: { color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', icon: CheckCircle2, label: 'Completed' },
    REJECTED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Rejected' },
    CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: XCircle, label: 'Cancelled' },
    NO_SHOW: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'No Show' },
};

export default function AgentVisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
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

    useEffect(() => {
        fetchVisits(1);
    }, [activeTab]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchVisits(newPage);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const tabs: { value: TabType; label: string }[] = [
        { value: 'pending', label: 'Pending' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'completed', label: 'Completed' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Visits & Showings
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage property visit requests and schedule
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchVisits(pagination.page)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    {/* Add Visit Button? Optional */}
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-1">
                <div className="flex gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.value
                                ? 'border-rose-500 text-rose-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="hidden sm:block text-xs text-gray-400">
                    Showing {visits.length} of {pagination.total} visits
                </div>
            </div>

            {/* Table Content */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-600"></div>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : visits.length === 0 ? (
                    <div className="p-16 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No visits found</h3>
                        <p className="text-gray-500 mt-1">No visits matching current filter.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Property</th>
                                        <th className="px-6 py-4 font-medium">Buyer</th>
                                        <th className="px-6 py-4 font-medium">Date & Time</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visits.map((visit) => {
                                        const config = statusConfig[visit.status] || statusConfig['REQUESTED'];
                                        const StatusIcon = config.icon;
                                        return (
                                            <tr key={visit.id} className="hover:bg-white/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={getImageUrl(visit.thumbnail_url)}
                                                            className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                                                            alt=""
                                                        />
                                                        <div>
                                                            <div className="font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={visit.property_title}>{visit.property_title}</div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" /> {visit.property_city}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{visit.buyer_name || 'Guest'}</div>
                                                    <div className="text-xs text-gray-500">{visit.buyer_email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        {formatDate(visit.confirmed_date || visit.preferred_date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/agent/visits/${visit.id}`}
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

                        {/* Mobile Cards (Visible on sm/xs) */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {visits.map((visit) => {
                                const config = statusConfig[visit.status] || statusConfig['REQUESTED'];
                                return (
                                    <Link key={visit.id} href={`/agent/visits/${visit.id}`} className="block p-4 hover:bg-white/50">
                                        <div className="flex items-center gap-4 mb-3">
                                            <img
                                                src={getImageUrl(visit.thumbnail_url)}
                                                className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                                                alt=""
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900 line-clamp-1">{visit.property_title}</div>
                                                <div className="text-sm text-gray-500 mt-0.5">{visit.buyer_name}</div>
                                                <span className={`inline-flex mt-2 items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${config.bg} ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(visit.confirmed_date || visit.preferred_date)}
                                            </span>
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
