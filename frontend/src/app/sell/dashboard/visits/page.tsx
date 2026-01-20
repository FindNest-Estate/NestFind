'use client';

import React, { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import {
    CalendarCheck,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    Calendar,
    MapPin,
    User,
    Home,
    Filter
} from 'lucide-react';

interface PropertyInfo {
    id: string;
    title: string;
    thumbnail_url: string | null;
    city: string | null;
}

interface BuyerInfo {
    id: string;
    name: string;
    email: string;
}

interface AgentInfo {
    id: string;
    name: string;
}

interface VisitItem {
    id: string;
    property: PropertyInfo;
    buyer: BuyerInfo;
    agent: AgentInfo | null;
    visit_date: string;
    requested_at: string;
    status: string;
    status_display: string;
    notes: string | null;
}

interface VisitsResponse {
    success: boolean;
    visits: VisitItem[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
    summary: {
        pending: number;
        upcoming: number;
        completed: number;
        total: number;
    };
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType }> = {
    REQUESTED: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
    APPROVED: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Calendar },
    COMPLETED: { color: 'text-[#ff385c]', bgColor: 'bg-rose-50 border-rose-200', icon: CheckCircle },
    CANCELLED: { color: 'text-slate-500', bgColor: 'bg-slate-100 border-slate-200', icon: XCircle },
    NO_SHOW: { color: 'text-slate-400', bgColor: 'bg-slate-50 border-slate-200', icon: XCircle }
};

export default function SellerVisitsPage() {
    const [visits, setVisits] = useState<VisitItem[]>([]);
    const [summary, setSummary] = useState({ pending: 0, upcoming: 0, completed: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    useEffect(() => {
        loadVisits();
    }, [activeFilter]);

    async function loadVisits() {
        try {
            setIsLoading(true);
            const params = activeFilter !== 'ALL' ? `?status=${activeFilter}` : '';
            const data = await get<VisitsResponse>(`/seller/visits${params}`);
            setVisits(data.visits);
            setSummary(data.summary);
        } catch (err) {
            console.error("Failed to load visits", err);
            setError("Failed to load visits");
        } finally {
            setIsLoading(false);
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#ff385c] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarCheck className="w-7 h-7 text-[#ff385c]" />
                        Property Visits
                    </h1>
                    <p className="text-slate-500 mt-1">Track visits and tours scheduled for your properties</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <Clock className="w-5 h-5 text-amber-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{summary.pending}</p>
                    <p className="text-sm text-slate-500">Pending</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{summary.upcoming}</p>
                    <p className="text-sm text-slate-500">Upcoming</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
                    <CheckCircle className="w-5 h-5 text-[#ff385c] mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{summary.completed}</p>
                    <p className="text-sm text-slate-500">Completed</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-100">
                    <CalendarCheck className="w-5 h-5 text-slate-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
                    <p className="text-sm text-slate-500">Total</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeFilter === filter
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/50'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Visits' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Visits List */}
            {visits.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarCheck className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">No visits scheduled</h3>
                    <p className="text-slate-500 mt-2">When buyers request property tours, they will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visits.map((visit) => {
                        const status = statusConfig[visit.status] || statusConfig.REQUESTED;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={visit.id}
                                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-20 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                                            {visit.property.thumbnail_url ? (
                                                <img
                                                    src={visit.property.thumbnail_url}
                                                    alt={visit.property.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Home className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 truncate">{visit.property.title}</h3>
                                            {visit.property.city && (
                                                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{visit.property.city}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visit Details */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8">
                                        {/* Buyer */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{visit.buyer.name}</p>
                                                <p className="text-xs text-slate-400">Buyer</p>
                                            </div>
                                        </div>

                                        {/* Visit Date */}
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{formatDate(visit.visit_date)}</p>
                                                <p className="text-xs text-slate-400">{formatTime(visit.visit_date)}</p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`text-sm font-medium ${status.color}`}>{visit.status_display}</span>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    {visit.agent && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>Agent:</span>
                                            <span className="font-medium text-slate-700">{visit.agent.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
