'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ArrowLeftRight, MapPin, Bed, Bath, Square, TrendingUp, TrendingDown } from 'lucide-react';
import { PropertyCard as IPropertyCard } from '@/lib/api/public';

interface PropertyComparisonProps {
    properties: IPropertyCard[];
    onClose: () => void;
}

export default function PropertyComparison({ properties, onClose }: PropertyComparisonProps) {
    if (properties.length < 2) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="glass-card p-6 max-w-md text-center">
                    <p className="text-gray-700 mb-4">Please select at least 2 properties to compare.</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // Calculate comparison metrics
    const prices = properties.map(p => p.price || 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const areas = properties.map(p => p.area_sqft || 0);
    const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;

    const formatPrice = (price: number | null) => {
        if (!price) return 'N/A';
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
        if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
        return `₹${price.toLocaleString()}`;
    };

    const getPriceComparison = (price: number | null) => {
        if (!price) return null;
        const diff = ((price - avgPrice) / avgPrice) * 100;
        return diff.toFixed(1);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card px-8 max-w-7xl w-full my-8 relative"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 -mx-6 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <ArrowLeftRight className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Property Comparison</h2>
                                <p className="text-sm text-gray-500">Comparing {properties.length} properties</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Comparison Grid */}
                <div className="py-6 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-4 bg-gray-50 font-semibold text-gray-700 sticky left-0 z-10 min-w-[200px]">
                                    Feature
                                </th>
                                {properties.map((property, index) => (
                                    <th key={property.id} className="p-4 bg-gray-50 min-w-[280px]">
                                        <div className="text-left">
                                            <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3 shadow-md">
                                                {property.thumbnail_url ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${property.thumbnail_url}`}
                                                        alt={property.title || 'Property'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                        <MapPin className="w-12 h-12 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-gray-900 text-lg mb-1 truncate">
                                                {property.title || 'Untitled Property'}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {[property.city, property.state].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Price */}
                            <tr className="border-t border-gray-200">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-white">Price</td>
                                {properties.map((property) => {
                                    const comparison = getPriceComparison(property.price);
                                    return (
                                        <td key={property.id} className="p-4">
                                            <div className="font-bold text-2xl text-gray-900 mb-1">
                                                {formatPrice(property.price)}
                                            </div>
                                            {comparison && (
                                                <div className={`flex items-center gap-1 text-sm ${parseFloat(comparison) > 0 ? 'text-red-600' : 'text-emerald-600'
                                                    }`}>
                                                    {parseFloat(comparison) > 0 ? (
                                                        <TrendingUp className="w-4 h-4" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4" />
                                                    )}
                                                    {Math.abs(parseFloat(comparison))}% vs avg
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Type */}
                            <tr className="border-t border-gray-200 bg-gray-50/50">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-gray-50/50">Type</td>
                                {properties.map((property) => (
                                    <td key={property.id} className="p-4">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                            {property.type || 'N/A'}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Bedrooms */}
                            <tr className="border-t border-gray-200">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-white">Bedrooms</td>
                                {properties.map((property) => (
                                    <td key={property.id} className="p-4">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Bed className="w-5 h-5 text-gray-400" />
                                            <span className="text-lg font-semibold">{property.bedrooms ?? 'N/A'}</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Bathrooms */}
                            <tr className="border-t border-gray-200 bg-gray-50/50">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-gray-50/50">Bathrooms</td>
                                {properties.map((property) => (
                                    <td key={property.id} className="p-4">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Bath className="w-5 h-5 text-gray-400" />
                                            <span className="text-lg font-semibold">{property.bathrooms ?? 'N/A'}</span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Area */}
                            <tr className="border-t border-gray-200">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-white">Area</td>
                                {properties.map((property) => (
                                    <td key={property.id} className="p-4">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Square className="w-5 h-5 text-gray-400" />
                                            <span className="text-lg font-semibold">
                                                {property.area_sqft?.toLocaleString() || 'N/A'} sqft
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Price per sqft */}
                            <tr className="border-t border-gray-200 bg-gray-50/50">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-gray-50/50">Price/sqft</td>
                                {properties.map((property) => {
                                    const pricePerSqft = property.price && property.area_sqft
                                        ? (property.price / property.area_sqft).toFixed(0)
                                        : null;
                                    return (
                                        <td key={property.id} className="p-4">
                                            {pricePerSqft ? (
                                                <span className="text-lg font-semibold text-gray-700">
                                                    ₹{parseInt(pricePerSqft).toLocaleString()}/sqft
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Location */}
                            <tr className="border-t border-gray-200">
                                <td className="p-4 font-semibold text-gray-700 sticky left-0 bg-white">Location</td>
                                {properties.map((property) => (
                                    <td key={property.id} className="p-4">
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">
                                                {[property.city, property.state].filter(Boolean).join(', ') || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-4 border-t border-blue-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Avg. Price</p>
                            <p className="text-lg font-bold text-gray-900">{formatPrice(avgPrice)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Avg. Area</p>
                            <p className="text-lg font-bold text-gray-900">{Math.round(avgArea).toLocaleString()} sqft</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Price Range</p>
                            <p className="text-lg font-bold text-gray-900">
                                {formatPrice(Math.min(...prices))} - {formatPrice(Math.max(...prices))}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Properties</p>
                            <p className="text-lg font-bold text-gray-900">{properties.length}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
