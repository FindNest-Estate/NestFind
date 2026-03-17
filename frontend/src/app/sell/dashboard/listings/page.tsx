'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Plus,
    Search,
    Filter,
    Eye,
    Edit2,
    AlertCircle,
    Trash2,
    CheckCircle,
    Send,
    Loader2,
    Home,
    Clock,
    Users,
    IndianRupee,
    MoreVertical,
    ExternalLink,
    TrendingUp
} from 'lucide-react';
import { getSellerProperties, deleteProperty, hireAgent, PropertySummary, PropertyStatus } from '@/lib/api/seller';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const statusStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Draft' },
    PENDING_ASSIGNMENT: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending Agent' },
    ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Assigned' },
    VERIFICATION_IN_PROGRESS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Verifying' },
    ACTIVE: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-900', label: 'Listed' },
    RESERVED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Reserved' },
    SOLD: { bg: 'bg-rose-50', text: 'text-[#ff385c]', border: 'border-rose-100', label: 'Sold' }
};

export default function SellerListingsPage() {
    const [properties, setProperties] = useState<PropertySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const fetchProperties = async () => {
        try {
            setIsLoading(true);
            const response = await getSellerProperties();
            setProperties(response.properties);
            setError(null);
        } catch (err) {
            setError('Failed to load properties. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleDelete = async (propertyId: string, title: string | null) => {
        const displayTitle = title || 'Untitled Property';
        if (!confirm(`Delete "${displayTitle}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingId(propertyId);
        setError(null);
        setSuccessMessage(null);

        try {
            await deleteProperty(propertyId);
            setSuccessMessage(`"${displayTitle}" has been deleted.`);
            await fetchProperties();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to delete property.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSubmitForReview = async (propertyId: string, title: string | null) => {
        const displayTitle = title || 'Untitled Property';
        if (!confirm(`Submit "${displayTitle}" for agent review? An agent will be assigned to verify your property.`)) {
            return;
        }

        setSubmittingId(propertyId);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await hireAgent(propertyId);
            setSuccessMessage(`"${displayTitle}" submitted! Agent ${result.agent_name} will review your property.`);
            await fetchProperties();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit for review. Make sure all required fields are filled.');
        } finally {
            setSubmittingId(null);
        }
    };

    const formatPrice = (price: number | null) => {
        if (!price) return null;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    // Filtered properties
    const filteredProperties = properties.filter(p => {
        const matchesSearch = !searchQuery ||
            p.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: properties.length,
        active: properties.filter(p => p.status === 'ACTIVE').length,
        draft: properties.filter(p => p.status === 'DRAFT').length,
        sold: properties.filter(p => p.status === 'SOLD').length
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/50 rounded-xl h-24" />
                    ))}
                </div>
                <div className="bg-white/50 rounded-2xl h-96" />
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
                            <Home className="w-6 h-6 text-white" />
                        </div>
                        My Listings
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Manage and track all your properties</p>
                </div>
                <Link
                    href="/sell/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF385C] via-rose-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-rose-500/20 hover:-translate-y-1 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Listing
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                            <Home className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{stats.total}</p>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Total</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{stats.active}</p>
                                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Active</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl shadow-sm">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{stats.draft}</p>
                                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Drafts</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl shadow-sm">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">{stats.sold}</p>
                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Sold</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white/90 backdrop-blur-lg border border-gray-200/60 rounded-xl shadow-sm hover:border-gray-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none items-center">
                    {['ALL', 'DRAFT', 'ACTIVE', 'RESERVED', 'SOLD'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${statusFilter === status
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 shadow-lg -translate-y-0.5 border-transparent'
                                : 'bg-white/90 backdrop-blur-lg text-gray-600 hover:text-gray-900 border border-gray-200/60 hover:border-gray-300 hover:bg-white'
                                }`}
                        >
                            {status === 'ALL' ? 'All' : statusStyles[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Property List */}
            {filteredProperties.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Plus className="w-10 h-10 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                        {properties.length === 0 ? 'Create your first listing' : 'No properties match your filters'}
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
                        {properties.length === 0
                            ? 'Start your selling journey by creating a property draft. You can save your progress and finish later.'
                            : 'Try adjusting your search or filter criteria.'}
                    </p>
                    {properties.length === 0 && (
                        <Link
                            href="/sell/create"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF385C] via-rose-500 to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20 hover:shadow-xl hover:-translate-y-1"
                        >
                            <Plus className="w-5 h-5" />
                            Create New Listing
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map((property) => {
                        const style = statusStyles[property.status] || statusStyles.DRAFT;
                        const imageUrl = getImageUrl(property.thumbnail_url);

                        return (
                            <div
                                key={property.id}
                                className="group bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="relative h-[220px] bg-gray-100 overflow-hidden">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={property.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                            <Home className="w-12 h-12 text-gray-300" />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest border shadow-sm ${style.bg} ${style.text} ${style.border}`}>
                                        {style.label}
                                    </div>

                                    {/* Stats Overlay */}
                                    {property.stats && (
                                        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                                            <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5" />
                                                {property.stats.views} Views
                                            </span>
                                            <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-[11px] font-bold flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                {property.stats.inquiries} Inquiries
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="py-5 px-6 flex-1 flex flex-col relative z-20">
                                    <Link href={`/properties/${property.id}`} className="group block mb-4 flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1 tracking-tight group-hover:text-indigo-600 transition-colors">
                                            {property.title || 'Untitled Property'}
                                        </h3>
                                        <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5 line-clamp-1">ID: {property.id.slice(0, 8)}</p>
                                    </Link>

                                    {/* Price */}
                                    <div className="pt-5 mt-auto border-t border-gray-100/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Price</p>
                                            <span className="text-xl font-bold text-gray-900 tracking-tight">
                                                {formatPrice(property.price) || <span className="text-gray-400 font-medium text-base">Not set</span>}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-5 border-t border-gray-100/60">
                                        {property.allowed_actions.includes('edit') && (
                                            <Link
                                                href={`/sell/create/${property.id}`}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 hover:border-gray-300 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </Link>
                                        )}

                                        {property.status === PropertyStatus.DRAFT && property.allowed_actions.includes('edit') && (
                                            <button
                                                onClick={() => handleSubmitForReview(property.id, property.title)}
                                                disabled={submittingId === property.id}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF385C] to-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg shadow-rose-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                                            >
                                                {submittingId === property.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Submit
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {property.status === PropertyStatus.ACTIVE && (
                                            <Link
                                                href={`/properties/${property.id}`}
                                                target="_blank"
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white !text-white rounded-xl text-sm font-bold hover:shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                                            >
                                                <ExternalLink className="w-4 h-4 text-white" />
                                                <span className="text-white">View Live</span>
                                            </Link>
                                        )}

                                        {property.allowed_actions.includes('delete') && (
                                            <button
                                                onClick={() => handleDelete(property.id, property.title)}
                                                disabled={deletingId === property.id}
                                                className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 border border-transparent hover:border-rose-100"
                                                title="Delete"
                                            >
                                                {deletingId === property.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-5 h-5" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
