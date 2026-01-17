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
        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                <Home className="w-10 h-10 text-[#FF385C]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
                Try adjusting your filters or check back later for new listings.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-[#FF385C] text-white rounded-lg font-medium hover:bg-[#E31C5F] transition-colors"
            >
                Reset Filters
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Hero Section */}
            <section className="bg-gradient-to-b from-rose-50 to-gray-50 pt-24 pb-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
                        Find Your Perfect Home
                    </h1>
                    <p className="text-gray-600 text-lg text-center mb-8 max-w-2xl mx-auto">
                        Browse verified properties from trusted sellers and agents across India.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
                        <div className="flex gap-2 bg-white p-2 rounded-full shadow-lg border border-gray-200">
                            <div className="flex-1 flex items-center gap-2 px-4">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Find your dream property..."
                                    value={searchCity}
                                    onChange={(e) => setSearchCity(e.target.value)}
                                    className="w-full py-2 outline-none text-gray-800 placeholder-gray-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className="p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Filter className="w-5 h-5" />
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-[#FF385C] text-white rounded-full font-medium hover:bg-[#E31C5F] transition-colors"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* Filters Panel */}
            {showFilters && (
                <section className="bg-white border-y border-gray-200 py-6 px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Keyword Search */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search Keywords</label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Search in title, description, address..."
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                            {/* Property Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={propertyType}
                                    onChange={(e) => setPropertyType(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {PROPERTY_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                <select
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {PRICE_RANGES.map((range) => (
                                        <option key={range.value} value={range.value}>{range.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bedrooms */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                                <select
                                    value={bedrooms}
                                    onChange={(e) => setBedrooms(Number(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {BEDROOM_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bathrooms */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                                <select
                                    value={bathrooms}
                                    onChange={(e) => setBathrooms(Number(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {BATHROOM_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Area Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                                <select
                                    value={areaRange}
                                    onChange={(e) => setAreaRange(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {AREA_RANGES.map((range) => (
                                        <option key={range.value} value={range.value}>{range.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent text-sm"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => fetchProperties(1)}
                                className="px-6 py-2 bg-[#FF385C] text-white rounded-lg font-medium hover:bg-[#E31C5F] transition-colors"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={() => {
                                    setSearchCity('');
                                    setPropertyType('');
                                    setPriceRange('');
                                    setBedrooms(0);
                                    setBathrooms(0);
                                    setAreaRange('');
                                    setKeyword('');
                                    setSortBy('newest');
                                    fetchProperties(1, true);
                                }}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                                Reset All
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Results */}
            <section className="py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isLoading ? 'Loading...' : `${pagination.total} Properties Found`}
                            </h2>
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                                    <div className="aspect-[4/3] bg-gray-200" />
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
                            {/* Property Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {properties.map((property) => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.total_pages > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <span className="px-4 py-2 text-gray-700">
                                        Page {pagination.page} of {pagination.total_pages}
                                    </span>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.has_more}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
