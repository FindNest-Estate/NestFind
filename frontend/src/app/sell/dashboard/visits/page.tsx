'use client';

import React, { useEffect, useState } from 'react';
import { get, getImageUrl } from '@/lib/api';
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100/60 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-rose-500 rounded-2xl shadow-sm">
                            <CalendarCheck className="w-6 h-6 text-white" />
                        </div>
                        Property Visits
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Track visits and tours scheduled for your properties</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl inline-block mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1">{summary.pending}</h3>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending</p>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl inline-block mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1">{summary.upcoming}</h3>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Upcoming</p>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl inline-block mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1">{summary.completed}</h3>
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Completed</p>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl inline-block mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <CalendarCheck className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">Total</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-8 mt-8">
                {['ALL', 'REQUESTED', 'APPROVED', 'COMPLETED', 'CANCELLED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${activeFilter === filter
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 shadow-lg -translate-y-0.5 border-transparent'
                            : 'bg-white/90 backdrop-blur-lg text-gray-600 hover:text-gray-900 border border-gray-200/60 hover:border-gray-300 hover:bg-white'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Visits' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Visits List */}
            {visits.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CalendarCheck className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">No visits scheduled</h3>
                    <p className="text-gray-500 font-medium max-w-md mx-auto">When buyers request property tours, they will appear here</p>
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
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-20 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm relative">
                                            {visit.property.thumbnail_url ? (
                                                <img
                                                    src={getImageUrl(visit.property.thumbnail_url) || ''}
                                                    alt={visit.property.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out absolute inset-0"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Home className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg truncate tracking-tight">{visit.property.title}</h3>
                                            {visit.property.city && (
                                                <div className="flex items-center gap-1.5 mt-2 text-sm font-medium text-gray-500">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span>{visit.property.city}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visit Details */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-10">
                                        {/* Buyer */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                                                <User className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{visit.buyer.name}</p>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Buyer</p>
                                            </div>
                                        </div>

                                        {/* Visit Date */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-white/50 backdrop-blur-md border border-gray-200/60 rounded-xl shadow-sm">
                                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{formatDate(visit.visit_date)}</p>
                                                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">{formatTime(visit.visit_date)}</p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-xl border font-bold text-[11px] uppercase tracking-widest shadow-sm ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`${status.color}`}>{visit.status_display}</span>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    {visit.agent && (
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest lg:ml-auto pt-4 lg:pt-0 border-t border-gray-100/60 lg:border-t-0">
                                            <span>Agent:</span>
                                            <span className="text-gray-900">{visit.agent.name}</span>
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
