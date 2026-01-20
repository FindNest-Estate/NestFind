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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Home className="w-7 h-7 text-[#ff385c]" />
                        My Listings
                    </h1>
                    <p className="text-slate-500 mt-1">Manage and track all your properties</p>
                </div>
                <Link
                    href="/sell/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff385c] text-white rounded-xl font-semibold hover:bg-[#d9324e] transition-all shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    New Listing
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Home className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-sm text-slate-500">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-[#ff385c]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                            <p className="text-sm text-slate-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.draft}</p>
                            <p className="text-sm text-slate-500">Drafts</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.sold}</p>
                            <p className="text-sm text-slate-500">Sold</p>
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
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-xl focus:ring-2 focus:ring-[#ff385c] focus:border-[#ff385c] transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['ALL', 'DRAFT', 'ACTIVE', 'RESERVED', 'SOLD'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${statusFilter === status
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/50'
                                }`}
                        >
                            {status === 'ALL' ? 'All' : statusStyles[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Property List */}
            {filteredProperties.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-[#ff385c]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {properties.length === 0 ? 'Create your first listing' : 'No properties match your filters'}
                    </h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        {properties.length === 0
                            ? 'Start your selling journey by creating a property draft. You can save your progress and finish later.'
                            : 'Try adjusting your search or filter criteria.'}
                    </p>
                    {properties.length === 0 && (
                        <Link
                            href="/sell/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff385c] text-white rounded-xl font-semibold hover:bg-[#d9324e] transition-colors shadow-lg"
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
                                className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Image */}
                                <div className="relative h-48 bg-slate-100 overflow-hidden">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={property.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                            <Home className="w-12 h-12 text-slate-300" />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                                        {style.label}
                                    </div>

                                    {/* Stats Overlay */}
                                    {property.stats && (
                                        <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                                            <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {property.stats.views}
                                            </span>
                                            <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {property.stats.inquiries}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">
                                        {property.title || 'Untitled Property'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-3">ID: {property.id.slice(0, 8)}...</p>

                                    {/* Price */}
                                    <div className="flex items-center gap-1 mb-4">
                                        <IndianRupee className="w-4 h-4 text-slate-900" />
                                        <span className="text-lg font-bold text-slate-800">
                                            {formatPrice(property.price) || <span className="text-slate-400 font-normal text-sm">Not set</span>}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                        {property.allowed_actions.includes('edit') && (
                                            <Link
                                                href={`/sell/create/${property.id}`}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </Link>
                                        )}

                                        {property.status === PropertyStatus.DRAFT && property.allowed_actions.includes('edit') && (
                                            <button
                                                onClick={() => handleSubmitForReview(property.id, property.title)}
                                                disabled={submittingId === property.id}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#ff385c] text-white rounded-lg text-sm font-medium hover:bg-[#d9324e] transition-colors disabled:opacity-50"
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
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                View Live
                                            </Link>
                                        )}

                                        {property.allowed_actions.includes('delete') && (
                                            <button
                                                onClick={() => handleDelete(property.id, property.title)}
                                                disabled={deletingId === property.id}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete"
                                            >
                                                {deletingId === property.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
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
