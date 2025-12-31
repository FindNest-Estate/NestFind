'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit2, AlertCircle, LayoutDashboard } from 'lucide-react';
import { getSellerProperties, PropertySummary, PropertyStatus } from '@/lib/api/seller';

export default function SellerListingsPage() {
    const [properties, setProperties] = useState<PropertySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProperties() {
            try {
                const response = await getSellerProperties();
                setProperties(response.properties);
            } catch (err) {
                setError('Failed to load properties. Please try again.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchProperties();
    }, []);

    // Status Badge Renderer (Strict Mapping)
    const renderStatusBadge = (status: PropertyStatus, label: string) => {
        switch (status) {
            case PropertyStatus.DRAFT:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{label}</span>;
            case PropertyStatus.PENDING_ASSIGNMENT:
            case PropertyStatus.RESERVED:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{label}</span>;
            case PropertyStatus.ASSIGNED:
            case PropertyStatus.VERIFICATION_IN_PROGRESS:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{label}</span>;
            case PropertyStatus.ACTIVE:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{label}</span>;
            case PropertyStatus.SOLD:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">{label}</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{label}</span>;
        }
    };

    // Loading State (Skeleton)
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        );
    }

    // EMPTY STATE (DB Truth)
    if (properties.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-8 shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your first listing</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Start your selling journey by creating a property draft. You can save your progress and finish later.
                </p>
                <Link
                    href="/sell/create"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Listing
                </Link>
            </div>
        );
    }

    // POPULATED STATE (Data Table)
    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    Your Properties <span className="ml-2 text-sm font-normal text-gray-500">{properties.length} Total</span>
                </h2>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                        <Filter className="w-4 h-4" />
                    </button>
                    <Link
                        href="/sell/create"
                        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Listing
                    </Link>
                </div>
            </div>

            {/* Property List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {properties.map((property) => (
                            <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail Fallback */}
                                        <div className="w-16 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                                            {property.thumbnail_url ? (
                                                <img src={property.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <LayoutDashboard className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{property.title}</div>
                                            <div className="text-xs text-gray-500">ID: {property.id.slice(0, 8)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {renderStatusBadge(property.status, property.display_status)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                    {property.price
                                        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: property.currency }).format(property.price)
                                        : <span className="text-gray-400 italic">Not set</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {property.allowed_actions.includes('edit') && (
                                            <button className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {property.allowed_actions.includes('view') && (
                                            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
