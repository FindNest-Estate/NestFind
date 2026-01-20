'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Building2,
    MapPin,
    Clock,
    CheckCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Home,
    BedDouble,
    Bath,
    Maximize,
    ArrowUpRight
} from 'lucide-react';
import { get } from '@/lib/api';
import Link from 'next/link';

interface Property {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    price: number;
    property_type: string;
    status: string;
    created_at: string;
    verified_at: string | null;
    seller_name: string;
    agent_name: string | null;
    thumbnail_url: string | null;
    visit_count: number;
    offer_count: number;
    bedrooms?: number;
    bathrooms?: number;
    area_sqft?: number;
}

interface PropertyStats {
    total: number;
    active: number;
    pending: number;
    sold: number;
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

interface PropertiesResponse {
    success: boolean;
    properties: Property[];
    stats: PropertyStats;
    pagination: Pagination;
}

export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [stats, setStats] = useState<PropertyStats | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 12, total: 0, total_pages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');

    const fetchProperties = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (typeFilter) params.set('type', typeFilter);

            const response = await get<PropertiesResponse>(`/admin/properties?${params.toString()}`);
            if (response.success) {
                setProperties(response.properties);
                setStats(response.stats);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            console.error('Failed to fetch properties', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, typeFilter]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'AVAILABLE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
            'SOLD': 'bg-blue-100 text-blue-700 border-blue-200',
            'REJECTED': 'bg-red-100 text-red-700 border-red-200'
        };
        return styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
                    <p className="text-slate-500">Manage listings and verifications</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchProperties(pagination.page)}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/properties/create"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-200 flex items-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Add Property
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Total Listings</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Active</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Home className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Sold</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.sold}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search properties by title, location..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchProperties(1)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                        >
                            <option value="">All Status</option>
                            <option value="AVAILABLE">Active</option>
                            <option value="PENDING">Pending</option>
                            <option value="SOLD">Sold</option>
                            <option value="REJECTED">Rejected</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                        >
                            <option value="">All Types</option>
                            <option value="SALE">For Sale</option>
                            <option value="RENT">For Rent</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Property Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : properties.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No properties found</h3>
                    <p className="text-slate-500 mt-1">Try adjusting your filters or search query</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {properties.map((property) => (
                            <div key={property.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                                {/* Image */}
                                <div className="relative h-48 bg-slate-100 overflow-hidden">
                                    {property.thumbnail_url ? (
                                        <img
                                            src={property.thumbnail_url}
                                            alt={property.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <Building2 className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border shadow-sm ${getStatusBadge(property.status)}`}>
                                            {property.status}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-white font-bold text-lg">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(property.price)}
                                        </p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-emerald-600 transition-colors">
                                            {property.title}
                                        </h3>
                                        <div className="flex items-start gap-1.5 text-slate-500 text-xs mb-3">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{property.address}, {property.city}, {property.state}</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 mb-3">
                                            <div className="flex flex-col items-center">
                                                <BedDouble className="w-4 h-4 text-slate-400 mb-1" />
                                                <span className="text-xs font-medium text-slate-700">{property.bedrooms} Beds</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-slate-100">
                                                <Bath className="w-4 h-4 text-slate-400 mb-1" />
                                                <span className="text-xs font-medium text-slate-700">{property.bathrooms} Baths</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-slate-100">
                                                <Maximize className="w-4 h-4 text-slate-400 mb-1" />
                                                <span className="text-xs font-medium text-slate-700">{property.area_sqft} sqft</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-1">
                                        <span className="text-xs text-slate-500">
                                            By {property.agent_name}
                                        </span>
                                        <Link
                                            href={`/admin/properties/${property.id}`}
                                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            Details <ArrowUpRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-medium">{properties.length}</span> of <span className="font-medium">{pagination.total}</span> listings
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchProperties(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                                onClick={() => fetchProperties(pagination.page + 1)}
                                disabled={pagination.page >= pagination.total_pages}
                                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
