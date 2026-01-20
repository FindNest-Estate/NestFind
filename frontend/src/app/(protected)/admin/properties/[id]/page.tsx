'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Calendar,
    Eye,
    MessageSquare,
    DollarSign,
    CheckCircle,
    AlertCircle,
    Loader2,
    Settings
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';

interface PageParams {
    id: string;
}

interface PropertyDetail {
    id: string;
    title: string;
    description: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    price: number;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    status: string;
    created_at: string;
    verified_at: string | null;
    seller: { id: string; name: string; email: string };
    agent: { id: string; name: string; email: string } | null;
    stats: { visits: number; offers: number; transactions: number };
    media: Array<{ id: string; url: string; type: string; is_primary: boolean }>;
}

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { value: 'PENDING_VERIFICATION', label: 'Pending Verification', color: 'bg-amber-100 text-amber-700' },
    { value: 'VERIFIED', label: 'Verified', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'RESERVED', label: 'Reserved', color: 'bg-blue-100 text-blue-700' },
    { value: 'SOLD', label: 'Sold', color: 'bg-purple-100 text-purple-700' },
    { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700' },
    { value: 'ARCHIVED', label: 'Archived', color: 'bg-slate-200 text-slate-600' }
];

export default function AdminPropertyDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusReason, setStatusReason] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadProperty();
    }, [resolvedParams.id]);

    const loadProperty = async () => {
        try {
            const response = await get<{ success: boolean; property: PropertyDetail }>(`/admin/properties/${resolvedParams.id}`);
            if (response.success) {
                setProperty(response.property);
                setSelectedStatus(response.property.status);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load property' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!property || selectedStatus === property.status) return;

        setUpdating(true);
        try {
            const response = await post(`/admin/properties/${property.id}/status`, {
                status: selectedStatus,
                reason: statusReason || undefined
            });

            if (response.success) {
                setMessage({ type: 'success', text: response.message });
                setShowStatusModal(false);
                loadProperty();
            } else {
                throw new Error(response.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update status' });
        } finally {
            setUpdating(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
        if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
    };

    const getStatusColor = (status: string) => {
        return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-slate-500">Property not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Properties
            </button>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(property.status)} mb-3`}>
                            {STATUS_OPTIONS.find(s => s.value === property.status)?.label || property.status}
                        </span>
                        <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                            <MapPin className="w-4 h-4" />
                            <span>{property.address}, {property.city}, {property.state} {property.pincode}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-emerald-600">{formatPrice(property.price)}</p>
                        <p className="text-sm text-slate-500 mt-1">{property.property_type}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={() => setShowStatusModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                        <Settings className="w-4 h-4" />
                        Change Status
                    </button>
                </div>
            </div>

            {/* Media Gallery */}
            {property.media.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Property Images</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {property.media.map((m) => (
                            <div key={m.id} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                                <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${m.url}`}
                                    alt="Property"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Stats */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Activity Stats</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <Eye className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-900">{property.stats.visits}</p>
                            <p className="text-xs text-slate-500">Visits</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <MessageSquare className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-900">{property.stats.offers}</p>
                            <p className="text-xs text-slate-500">Offers</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-900">{property.stats.transactions}</p>
                            <p className="text-xs text-slate-500">Transactions</p>
                        </div>
                    </div>
                </div>

                {/* Seller & Agent */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Parties</h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Seller</p>
                            <p className="font-medium text-slate-900">{property.seller.name}</p>
                            <p className="text-sm text-slate-500">{property.seller.email}</p>
                        </div>
                        {property.agent ? (
                            <div className="p-4 bg-emerald-50 rounded-lg">
                                <p className="text-xs text-emerald-600 mb-1">Assigned Agent</p>
                                <p className="font-medium text-slate-900">{property.agent.name}</p>
                                <p className="text-sm text-slate-500">{property.agent.email}</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 rounded-lg">
                                <p className="text-amber-700 text-sm">No agent assigned</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Property Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Bedrooms</p>
                        <p className="text-lg font-bold text-slate-900">{property.bedrooms || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Bathrooms</p>
                        <p className="text-lg font-bold text-slate-900">{property.bathrooms || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Area</p>
                        <p className="text-lg font-bold text-slate-900">{property.area_sqft ? `${property.area_sqft} sqft` : '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Type</p>
                        <p className="text-lg font-bold text-slate-900">{property.property_type}</p>
                    </div>
                </div>

                {property.description && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-600">{property.description}</p>
                    </div>
                )}
            </div>

            {/* Timestamps */}
            <div className="bg-slate-50 rounded-xl p-4 flex gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {property.created_at ? format(new Date(property.created_at), 'MMM d, yyyy') : '-'}</span>
                </div>
                {property.verified_at && (
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Verified: {format(new Date(property.verified_at), 'MMM d, yyyy')}</span>
                    </div>
                )}
            </div>

            {/* Status Override Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowStatusModal(false)} />
                    <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Change Property Status</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">New Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        {selectedStatus === 'VERIFIED' && (
                            <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                <h4 className="text-sm font-bold text-emerald-800 mb-2">Verification Checklist</h4>
                                <div className="space-y-2">
                                    {[
                                        'Seller Identity Verified (KYC)',
                                        'Property Ownership Documents Checked',
                                        'Location & Address Confirmed',
                                        'Images Meet Quality Standards'
                                    ].map((label, idx) => (
                                        <label key={idx} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-emerald-700">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                                id={`check-${idx}`}
                                                onChange={(e) => {
                                                    const checks = document.querySelectorAll('input[type="checkbox"]:checked');
                                                    const btn = document.getElementById('update-status-btn') as HTMLButtonElement;
                                                    if (btn) btn.disabled = checks.length < 4;
                                                }}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
                            <textarea
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder="Add a reason for this change..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                id="update-status-btn"
                                onClick={handleStatusUpdate}
                                disabled={updating || selectedStatus === property.status || (selectedStatus === 'VERIFIED' && document.querySelectorAll('input[type="checkbox"]:checked').length < 4)}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                            >
                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
