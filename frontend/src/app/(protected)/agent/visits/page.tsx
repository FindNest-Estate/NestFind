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
    Building2
} from 'lucide-react';
import { get } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get full image URL
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
    APPROVED: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2, label: 'Approved' },
    CHECKED_IN: { color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', icon: CheckCircle2, label: 'Checked In' },
    COMPLETED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Completed' },
    REJECTED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Rejected' },
    CANCELLED: { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: XCircle, label: 'Cancelled' },
    NO_SHOW: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'No Show' },
};

export default function AgentVisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('pending');

    const getStatusFilter = (tab: TabType): string => {
        switch (tab) {
            case 'pending':
                return 'REQUESTED,COUNTERED';
            case 'upcoming':
                return 'APPROVED,CHECKED_IN';
            case 'completed':
                return 'COMPLETED,REJECTED,CANCELLED,NO_SHOW';
            default:
                return '';
        }
    };

    const fetchVisits = async () => {
        setLoading(true);
        setError(null);
        try {
            const status = getStatusFilter(activeTab);
            const response = await get<VisitsResponse>(`/visits?status=${status}&role=agent`);
            setVisits(response.visits || []);
        } catch (err: any) {
            console.error('Failed to fetch visits:', err);
            setError(err.message || 'Failed to load visits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, [activeTab]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getConfig = (status: string) => {
        return statusConfig[status] || {
            color: 'text-gray-600',
            bg: 'bg-gray-50 border-gray-200',
            icon: AlertCircle,
            label: status
        };
    };

    const tabs: { value: TabType; label: string }[] = [
        { value: 'pending', label: 'Pending' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'completed', label: 'Completed' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-emerald-600" />
                        Visit Requests
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage property visit requests from buyers
                    </p>
                </div>
                <button
                    onClick={fetchVisits}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.value
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
                        onClick={fetchVisits}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : visits.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No visit requests</h3>
                    <p className="text-slate-500 mt-2">
                        {activeTab === 'pending'
                            ? "No pending visit requests at the moment."
                            : activeTab === 'upcoming'
                                ? "No upcoming visits scheduled."
                                : "No completed visits yet."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {visits.map((visit) => {
                        const config = getConfig(visit.status);
                        const StatusIcon = config.icon;

                        return (
                            <Link
                                key={visit.id}
                                href={`/agent/visits/${visit.id}`}
                                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Property Image */}
                                    <div className="sm:w-40 h-32 sm:h-auto bg-slate-100 flex-shrink-0 overflow-hidden">
                                        <img
                                            src={getImageUrl(visit.thumbnail_url)}
                                            alt={visit.property_title || 'Property'}
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
                                                    {visit.property_title || 'Property Visit'}
                                                </h3>

                                                {/* Details */}
                                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                    {visit.property_city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" />
                                                            {visit.property_city}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(visit.confirmed_date || visit.preferred_date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {visit.buyer_name || 'Buyer'}
                                                    </span>
                                                </div>

                                                {/* Buyer Message */}
                                                {visit.buyer_message && (
                                                    <p className="mt-2 text-sm text-slate-400 truncate">
                                                        "{visit.buyer_message}"
                                                    </p>
                                                )}
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
        </div>
    );
}
