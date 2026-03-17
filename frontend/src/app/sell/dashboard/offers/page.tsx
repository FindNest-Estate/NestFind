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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100/60 pb-6 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-rose-500 rounded-2xl shadow-sm">
                            <HandCoins className="w-6 h-6 text-white" />
                        </div>
                        Offers
                        {pendingCount > 0 && (
                            <span className="ml-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                                {pendingCount} Pending
                            </span>
                        )}
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Manage offers from interested buyers</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${activeFilter === filter
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 shadow-lg -translate-y-0.5 border-transparent'
                            : 'bg-white/90 backdrop-blur-lg text-gray-600 hover:text-gray-900 border border-gray-200/60 hover:border-gray-300 hover:bg-white'
                            }`}
                    >
                        {filter === 'ALL' ? 'All Offers' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Offers List */}
            {offers.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <HandCoins className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">No offers yet</h3>
                    <p className="text-gray-500 font-medium max-w-md mx-auto">When buyers make offers on your properties, they will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {offers.map((offer) => {
                        const status = statusConfig[offer.status] || statusConfig.PENDING;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={offer.id}
                                className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100/60 p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-24 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                                            {offer.property.thumbnail_url ? (
                                                <img
                                                    src={offer.property.thumbnail_url}
                                                    alt={offer.property.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                                                        <HandCoins className="w-6 h-6 text-gray-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg truncate tracking-tight">{offer.property.title}</h3>
                                            <div className="flex items-center gap-2 mt-2 text-sm font-medium text-gray-500">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="truncate">{offer.buyer.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Offer Details */}
                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="text-left sm:text-center">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Offered Price</p>
                                            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatPrice(offer.offered_price)}</p>
                                        </div>

                                        {offer.counter_price && (
                                            <>
                                                <ArrowRight className="w-5 h-5 text-gray-300 hidden md:block" />
                                                <div className="text-left sm:text-center">
                                                    <p className="text-[11px] font-bold text-purple-600 uppercase tracking-widest mb-1">Your Counter</p>
                                                    <p className="text-xl font-bold text-purple-600 tracking-tight">{formatPrice(offer.counter_price)}</p>
                                                </div>
                                            </>
                                        )}

                                        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-xl border font-bold text-[11px] uppercase tracking-widest shadow-sm ${status.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                            <span className={`${status.color}`}>{status.label}</span>
                                        </div>

                                        <div className="text-left sm:text-right hidden sm:block">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                                            <p className="text-sm font-bold text-gray-600">{formatDate(offer.created_at)}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {offer.status === 'PENDING' && (
                                        <div className="flex items-center gap-3 lg:ml-auto pt-6 lg:pt-0 border-t border-gray-100/60 lg:border-t-0 w-full lg:w-auto mt-6 lg:mt-0 relative z-10">
                                            <button
                                                onClick={() => handleOfferAction(offer.id, 'ACCEPT')}
                                                disabled={actionLoading === offer.id}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                                            >
                                                {actionLoading === offer.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                ) : (
                                                    'Accept'
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOffer(offer);
                                                    setShowCounterModal(true);
                                                }}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                                            >
                                                Counter
                                            </button>
                                            <button
                                                onClick={() => handleOfferAction(offer.id, 'REJECT')}
                                                disabled={actionLoading === offer.id}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
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
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/50 p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Counter Offer</h3>
                        <p className="text-sm font-medium text-gray-500 mb-8">
                            Current offer: <span className="font-bold text-gray-900">{formatPrice(selectedOffer.offered_price)}</span>
                        </p>
                        <div className="mb-8">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Your counter price</label>
                            <div className="relative group">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="number"
                                    value={counterPrice}
                                    onChange={(e) => setCounterPrice(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 shadow-sm rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold text-gray-900 text-lg placeholder:text-gray-300 placeholder:font-medium placeholder:text-base"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleOfferAction(selectedOffer.id, 'COUNTER')}
                                disabled={!counterPrice || actionLoading === selectedOffer.id}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                            >
                                {actionLoading === selectedOffer.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    'Send Counter'
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCounterModal(false);
                                    setCounterPrice('');
                                    setSelectedOffer(null);
                                }}
                                className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
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
