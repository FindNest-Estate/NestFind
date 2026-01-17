'use client';

import { useState, useEffect } from 'react';
import {
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    AlertCircle,
    ChevronRight,
    Building2,
    User,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';

interface Offer {
    id: string;
    property_id: string;
    buyer_id: string;
    offered_price: number;
    counter_price?: number;
    status: string;
    expires_at: string;
    buyer_message?: string;
    created_at: string;
    property_title?: string;
    property_price?: number;
    property_city?: string;
    thumbnail_url?: string;
    buyer_name?: string;
    buyer_email?: string;
}

interface OffersResponse {
    success: boolean;
    offers: Offer[];
    pagination: {
        page: number;
        total: number;
        total_pages: number;
    };
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
    PENDING: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
    ACCEPTED: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Accepted' },
    REJECTED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Rejected' },
    COUNTERED: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: TrendingUp, label: 'Countered' },
    EXPIRED: { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Clock, label: 'Expired' },
    WITHDRAWN: { color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: XCircle, label: 'Withdrawn' },
};

export default function AgentOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [counterModal, setCounterModal] = useState<{ offerId: string; currentPrice: number } | null>(null);
    const [counterPrice, setCounterPrice] = useState('');

    useEffect(() => {
        fetchOffers();
    }, [activeTab]);

    const fetchOffers = async () => {
        setLoading(true);
        setError(null);
        try {
            const status = activeTab === 'pending' ? 'PENDING,COUNTERED' : '';
            const response = await get<OffersResponse>(`/offers?role=agent&status=${status}`);
            setOffers(response.offers || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (offerId: string) => {
        if (!confirm('Accept this offer? This will initiate the reservation process.')) return;
        setActionLoading(offerId);
        try {
            await post(`/offers/${offerId}/accept`);
            fetchOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to accept offer');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (offerId: string) => {
        const reason = prompt('Reason for rejection (optional):');
        setActionLoading(offerId);
        try {
            await post(`/offers/${offerId}/reject`, { reason });
            fetchOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to reject offer');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCounter = async () => {
        if (!counterModal) return;
        const price = parseFloat(counterPrice);
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid counter price');
            return;
        }
        setActionLoading(counterModal.offerId);
        try {
            await post(`/offers/${counterModal.offerId}/counter`, { counter_price: price });
            setCounterModal(null);
            setCounterPrice('');
            fetchOffers();
        } catch (err: any) {
            alert(err.message || 'Failed to counter offer');
        } finally {
            setActionLoading(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const getConfig = (status: string) => {
        return statusConfig[status] || { color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle, label: status };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-7 h-7 text-emerald-600" />
                        Property Offers
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage offers on your assigned properties
                    </p>
                </div>
                <button
                    onClick={fetchOffers}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'pending'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    Pending Action
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'all'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    All Offers
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600">{error}</p>
                </div>
            ) : offers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No offers</h3>
                    <p className="text-slate-500 mt-2">
                        {activeTab === 'pending'
                            ? "No pending offers at the moment."
                            : "No offers found."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {offers.map((offer) => {
                        const config = getConfig(offer.status);
                        const StatusIcon = config.icon;
                        const isPending = offer.status === 'PENDING';
                        const isCountered = offer.status === 'COUNTERED';
                        const priceDiff = offer.property_price
                            ? ((offer.offered_price - offer.property_price) / offer.property_price) * 100
                            : 0;

                        return (
                            <div
                                key={offer.id}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col lg:flex-row">
                                    {/* Property Image */}
                                    <div className="lg:w-48 h-32 lg:h-auto bg-slate-100 flex-shrink-0">
                                        <img
                                            src={offer.thumbnail_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'}
                                            alt={offer.property_title || 'Property'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                {/* Status */}
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {config.label}
                                                </div>

                                                {/* Property */}
                                                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                                                    {offer.property_title || 'Property'}
                                                </h3>

                                                {/* Price Comparison */}
                                                <div className="mt-3 flex items-center gap-4">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Offer</p>
                                                        <p className="text-xl font-bold text-emerald-600">
                                                            {formatCurrency(offer.offered_price)}
                                                        </p>
                                                    </div>
                                                    {offer.property_price && (
                                                        <>
                                                            <div className="w-px h-10 bg-slate-200"></div>
                                                            <div>
                                                                <p className="text-xs text-slate-500">Asking</p>
                                                                <p className="text-lg text-slate-700">
                                                                    {formatCurrency(offer.property_price)}
                                                                </p>
                                                            </div>
                                                            <div className={`flex items-center gap-1 text-sm ${priceDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {priceDiff >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                                {priceDiff.toFixed(1)}%
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Buyer */}
                                                <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {offer.buyer_name || 'Buyer'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        Expires {format(new Date(offer.expires_at), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>

                                                {offer.buyer_message && (
                                                    <p className="mt-2 text-sm text-slate-500 italic">
                                                        "{offer.buyer_message}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {(isPending || isCountered) && (
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleAccept(offer.id)}
                                                        disabled={actionLoading === offer.id}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCounterModal({ offerId: offer.id, currentPrice: offer.offered_price });
                                                            setCounterPrice(offer.offered_price.toString());
                                                        }}
                                                        disabled={actionLoading === offer.id}
                                                        className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50"
                                                    >
                                                        Counter
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(offer.id)}
                                                        disabled={actionLoading === offer.id}
                                                        className="px-4 py-2 border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Counter Modal */}
            {counterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Counter Offer</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Offer: {formatCurrency(counterModal.currentPrice)}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={counterPrice}
                                    onChange={(e) => setCounterPrice(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold"
                                    placeholder="Enter counter price"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCounterModal(null)}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCounter}
                                disabled={actionLoading !== null}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                Send Counter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
