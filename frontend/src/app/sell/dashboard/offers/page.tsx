'use client';

import React, { useEffect, useState } from 'react';
import { get, put } from '@/lib/api';
import {
    HandCoins,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    ArrowLeftRight,
    IndianRupee,
    Home,
    User,
    Filter,
    ChevronRight,
    MessageCircle
} from 'lucide-react';

interface PropertyInfo {
    id: string;
    title: string;
    price: number | null;
    thumbnail_url: string | null;
}

interface BuyerInfo {
    id: string;
    name: string;
    email: string;
}

interface OfferItem {
    id: string;
    property: PropertyInfo;
    buyer: BuyerInfo;
    offered_price: number;
    status: string;
    created_at: string;
    expires_at: string | null;
    counter_price: number | null;
    notes: string | null;
}

interface OffersResponse {
    success: boolean;
    offers: OfferItem[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
    PENDING: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
    ACCEPTED: { color: 'text-[#ff385c]', bgColor: 'bg-rose-50 border-rose-200', icon: CheckCircle, label: 'Accepted' },
    REJECTED: { color: 'text-slate-500', bgColor: 'bg-slate-100 border-slate-200', icon: XCircle, label: 'Rejected' },
    COUNTERED: { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', icon: ArrowLeftRight, label: 'Countered' },
    EXPIRED: { color: 'text-slate-400', bgColor: 'bg-slate-50 border-slate-200', icon: Clock, label: 'Expired' },
    WITHDRAWN: { color: 'text-slate-400', bgColor: 'bg-slate-50 border-slate-200', icon: XCircle, label: 'Withdrawn' }
};

export default function SellerOffersPage() {
    const [offers, setOffers] = useState<OfferItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [selectedOffer, setSelectedOffer] = useState<OfferItem | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [counterPrice, setCounterPrice] = useState<string>('');
    const [showCounterModal, setShowCounterModal] = useState(false);

    useEffect(() => {
        loadOffers();
    }, [activeFilter]);

    async function loadOffers() {
        try {
            setIsLoading(true);
            const params = activeFilter !== 'ALL' ? `?status=${activeFilter}` : '';
            const data = await get<OffersResponse>(`/seller/offers${params}`);
            setOffers(data.offers);
        } catch (err) {
            console.error("Failed to load offers", err);
            setError("Failed to load offers");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleOfferAction(offerId: string, action: 'ACCEPT' | 'REJECT' | 'COUNTER') {
        try {
            setActionLoading(offerId);
            const body: any = { action };
            if (action === 'COUNTER' && counterPrice) {
                body.counter_price = parseFloat(counterPrice);
            }
            await put(`/seller/offers/${offerId}/respond`, body);
            setShowCounterModal(false);
            setCounterPrice('');
            setSelectedOffer(null);
            await loadOffers();
        } catch (err) {
            console.error("Failed to respond to offer", err);
        } finally {
            setActionLoading(null);
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const pendingCount = offers.filter(o => o.status === 'PENDING').length;

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <HandCoins className="w-7 h-7 text-[#ff385c]" />
                        Offers
                        {pendingCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                                {pendingCount} pending
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">Manage offers from interested buyers</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeFilter === filter
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/50'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Offers' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Offers List */}
            {offers.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HandCoins className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">No offers yet</h3>
                    <p className="text-slate-500 mt-2">When buyers make offers on your properties, they will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {offers.map((offer) => {
                        const status = statusConfig[offer.status] || statusConfig.PENDING;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={offer.id}
                                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-20 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                                            {offer.property.thumbnail_url ? (
                                                <img
                                                    src={offer.property.thumbnail_url}
                                                    alt={offer.property.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Home className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 truncate">{offer.property.title}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                                <User className="w-4 h-4" />
                                                <span className="truncate">{offer.buyer.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Offer Details */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400 uppercase">Offered</p>
                                            <p className="text-lg font-bold text-slate-800">{formatPrice(offer.offered_price)}</p>
                                        </div>

                                        {offer.counter_price && (
                                            <div className="text-center">
                                                <p className="text-xs text-slate-400 uppercase">Counter</p>
                                                <p className="text-lg font-bold text-purple-600">{formatPrice(offer.counter_price)}</p>
                                            </div>
                                        )}

                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                                        </div>

                                        <p className="text-sm text-slate-400">{formatDate(offer.created_at)}</p>
                                    </div>

                                    {/* Actions */}
                                    {offer.status === 'PENDING' && (
                                        <div className="flex items-center gap-2 lg:ml-auto">
                                            <button
                                                onClick={() => handleOfferAction(offer.id, 'ACCEPT')}
                                                disabled={actionLoading === offer.id}
                                                className="px-4 py-2 bg-[#ff385c] text-white rounded-lg font-medium hover:bg-[#d9324e] transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === offer.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'Accept'
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOffer(offer);
                                                    setShowCounterModal(true);
                                                }}
                                                className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                                            >
                                                Counter
                                            </button>
                                            <button
                                                onClick={() => handleOfferAction(offer.id, 'REJECT')}
                                                disabled={actionLoading === offer.id}
                                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Counter Offer Modal */}
            {showCounterModal && selectedOffer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Counter Offer</h3>
                        <p className="text-slate-500 mb-4">
                            Current offer: <span className="font-semibold text-slate-800">{formatPrice(selectedOffer.offered_price)}</span>
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Your counter price</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="number"
                                    value={counterPrice}
                                    onChange={(e) => setCounterPrice(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ff385c] focus:border-[#ff385c]"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleOfferAction(selectedOffer.id, 'COUNTER')}
                                disabled={!counterPrice || actionLoading === selectedOffer.id}
                                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                            >
                                {actionLoading === selectedOffer.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    'Send Counter Offer'
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCounterModal(false);
                                    setCounterPrice('');
                                    setSelectedOffer(null);
                                }}
                                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
