'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
    Search,
    MapPin,
    Bed,
    Bath,
    Square,
    Home,
    Building2,
    Warehouse,
    TreePine,
    Filter,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { browseProperties, PropertyCard as IPropertyCard, BrowseFilters } from '@/lib/api/public';
import PropertyCard from '@/components/PropertyCard';
import PropertyCategories from '@/components/buyer/PropertyCategories';

/**
 * Property Browse Page - /properties
 * 
 * Public page for browsing ACTIVE properties.
 * No authentication required.
 */

const PROPERTY_TYPES = [
    { value: '', label: 'All Types', icon: Home },
    { value: 'HOUSE', label: 'House', icon: Home },
    { value: 'APARTMENT', label: 'Apartment', icon: Building2 },
    { value: 'LAND', label: 'Land', icon: TreePine },
    { value: 'COMMERCIAL', label: 'Commercial', icon: Warehouse },
];

const PRICE_RANGES = [
    { value: '', label: 'Any Price' },
    { value: '0-2500000', label: 'Under ₹25 Lakh' },
    { value: '2500000-5000000', label: '₹25L - ₹50L' },
    { value: '5000000-10000000', label: '₹50L - ₹1Cr' },
    { value: '10000000-25000000', label: '₹1Cr - ₹2.5Cr' },
    { value: '25000000-0', label: 'Above ₹2.5Cr' },
];

const BEDROOM_OPTIONS = [
    { value: 0, label: 'Any' },
    { value: 1, label: '1+' },
    { value: 2, label: '2+' },
    { value: 3, label: '3+' },
    { value: 4, label: '4+' },
];

const BATHROOM_OPTIONS = [
    { value: 0, label: 'Any' },
    { value: 1, label: '1+' },
    { value: 2, label: '2+' },
    { value: 3, label: '3+' },
];

const AREA_RANGES = [
    { value: '', label: 'Any Size' },
    { value: '0-500', label: 'Under 500 sqft' },
    { value: '500-1000', label: '500-1000 sqft' },
    { value: '1000-2000', label: '1000-2000 sqft' },
    { value: '2000-5000', label: '2000-5000 sqft' },
    { value: '5000-0', label: 'Above 5000 sqft' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'area_desc', label: 'Area: Largest First' },
    { value: 'area_asc', label: 'Area: Smallest First' },
];



function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-rose-100 to-rose-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <Home className="w-12 h-12 text-[#FF385C]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">No properties found</h3>
            <p className="text-gray-500 text-center max-w-md mb-8 text-base">
                We couldn't find any properties matching your exact criteria. Try adjusting your filters or search in a different area.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
                Reset All Filters
            </button>
        </div>
    );
}

export default function PropertiesBrowsePage() {
    const [properties, setProperties] = useState<IPropertyCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        per_page: 12,
        total: 0,
        total_pages: 0,
        has_more: false
    });

    // Filters
    const [searchCity, setSearchCity] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [priceRange, setPriceRange] = useState('');
    const [bedrooms, setBedrooms] = useState(0);
    const [bathrooms, setBathrooms] = useState(0);
    const [areaRange, setAreaRange] = useState('');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'area_desc' | 'area_asc'>('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const fetchProperties = useCallback(async (page = 1, resetFilters = false) => {
        setIsLoading(true);
        setError(null);

        try {
            const filters: BrowseFilters = {
                page,
                per_page: 12,
            };

            if (!resetFilters) {
                if (searchCity.trim()) filters.city = searchCity.trim();
                if (propertyType) filters.type = propertyType;
                if (bedrooms > 0) filters.bedrooms = bedrooms;
                if (bathrooms > 0) filters.bathrooms = bathrooms;
                if (keyword.trim()) filters.keyword = keyword.trim();
                // Only send sort_by if it's not the default 'newest'
                if (sortBy && sortBy !== 'newest') filters.sort_by = sortBy;

                if (priceRange) {
                    const [min, max] = priceRange.split('-').map(Number);
                    if (min > 0) filters.min_price = min;
                    if (max > 0) filters.max_price = max;
                }

                if (areaRange) {
                    const [minA, maxA] = areaRange.split('-').map(Number);
                    if (minA > 0) filters.min_area = minA;
                    if (maxA > 0) filters.max_area = maxA;
                }

                // TODO: Apply category filter to backend when mapping is available
                // For now, categories are visual only
            }

            const response = await browseProperties(filters);
            setProperties(response.properties);
            setPagination(response.pagination);
        } catch (err) {
            console.error('Failed to fetch properties:', err);
            setError('Failed to load properties. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [searchCity, propertyType, priceRange, bedrooms, bathrooms, areaRange, keyword, sortBy]);

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProperties(1);
    };

    const handlePageChange = (newPage: number) => {
        fetchProperties(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        // TODO: Connect to backend filtering when category mapping is available
        fetchProperties(1);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
            <Navbar />

            {/* Sticky Filter Bar (Glassmorphism effect) */}
            <section className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-200 z-40 shadow-sm/50 transition-all">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Left: Search Input */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
                        <div className="flex items-center bg-gray-100 rounded-full focus-within:ring-2 focus-within:ring-[#FF385C] focus-within:bg-white transition-all overflow-hidden border border-transparent focus-within:border-gray-300">
                            <div className="pl-4 pr-2 py-2 shrink-0">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="City, neighborhood, or zip"
                                value={searchCity}
                                onChange={(e) => setSearchCity(e.target.value)}
                                className="w-full outline-none text-sm font-medium bg-transparent py-2 truncate"
                            />
                            <button
                                type="submit"
                                className="bg-[#FF385C] text-white px-4 py-2 text-sm font-semibold hover:bg-[#E31C5F] transition-colors h-full rounded-r-full shrink-0"
                            >
                                Search
                            </button>
                        </div>
                    </form>

                    {/* Right: Inline Filters */}
                    <div className="hidden lg:flex items-center gap-3 shrink-0 ml-6">
                        <select
                            value={propertyType}
                            onChange={(e) => { setPropertyType(e.target.value); fetchProperties(1); }}
                            className="pl-4 pr-8 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-[#FF385C] appearance-none cursor-pointer"
                        >
                            {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <select
                            value={priceRange}
                            onChange={(e) => { setPriceRange(e.target.value); fetchProperties(1); }}
                            className="pl-4 pr-8 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-[#FF385C] appearance-none cursor-pointer"
                        >
                            <option value="">Price (Any)</option>
                            {PRICE_RANGES.filter(r => r.value !== '').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <select
                            value={bedrooms}
                            onChange={(e) => { setBedrooms(Number(e.target.value)); fetchProperties(1); }}
                            className="pl-4 pr-8 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-[#FF385C] appearance-none cursor-pointer"
                        >
                            <option value={0}>Beds (Any)</option>
                            {BEDROOM_OPTIONS.filter(o => o.value !== 0).map(o => <option key={o.value} value={o.value}>{o.label} Beds</option>)}
                        </select>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-2.5 border rounded-full text-sm font-semibold transition-all shadow-sm ${showFilters ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>

                    {/* Mobile Filters Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden p-2 rounded-full border border-gray-300 ml-3 text-gray-600 hover:bg-gray-50 shrink-0"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {/* Expanded Filters Dropdown (Absolute overlay) */}
                {showFilters && (
                    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-2xl z-50 p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {/* Re-include main filters for mobile view */}
                            <div className="lg:hidden flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Type</label>
                                <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="lg:hidden flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Price</label>
                                <select value={priceRange} onChange={e => setPriceRange(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {PRICE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="lg:hidden flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Beds</label>
                                <select value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {BEDROOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Baths</label>
                                <select value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {BATHROOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Area</label>
                                <select value={areaRange} onChange={e => setAreaRange(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {AREA_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Sort By</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 col-span-full md:col-span-2 lg:col-span-3">
                                <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">Keywords</label>
                                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. pool, modern, quiet..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="max-w-7xl mx-auto flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                            <button
                                onClick={() => {
                                    setSearchCity(''); setPropertyType(''); setPriceRange(''); setBedrooms(0); setBathrooms(0); setAreaRange(''); setKeyword(''); setSortBy('newest');
                                    fetchProperties(1, true);
                                }}
                                className="px-6 py-2 bg-white text-gray-600 font-semibold hover:bg-gray-50 rounded-lg border border-gray-200"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => { fetchProperties(1); setShowFilters(false); }}
                                className="px-6 py-2 bg-[#FF385C] text-white font-semibold rounded-lg hover:bg-[#E31C5F]"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                {isLoading ? 'Searching properties...' : 'Real Estate & Homes For Sale'}
                            </h2>
                            {!isLoading && (
                                <p className="text-gray-500 font-medium mt-1">
                                    Displaying {pagination.total} matching properties
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Property list content */}
                    <div className="w-full">
                        <div className="w-full">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700 mb-6">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                                            <div className="aspect-[3/2] bg-gray-200" />
                                            <div className="p-4 space-y-3">
                                                <div className="h-6 bg-gray-200 rounded w-1/2" />
                                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : properties.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                        {properties.map((property) => (
                                            <PropertyCard key={property.id} property={property} />
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {pagination.total_pages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pb-8 pt-4">
                                            <button
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <span className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                {pagination.page} / {pagination.total_pages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={!pagination.has_more}
                                                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
