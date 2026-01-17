'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    MessageSquare,
    ArrowRight,
    Loader2
} from 'lucide-react';
import {
    getAgentOffers,
    manageOfferAction,
    AgentOffer
} from '@/lib/api/agent';

// Helper for formatting currency
const formatCurrency = (val: number) => {
    return '₹ ' + (val / 100000).toFixed(2) + ' L';
};

export default function NegotiationsPage() {
    const [offers, setOffers] = useState<AgentOffer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadOffers();
    }, []);

    async function loadOffers() {
        try {
            const res = await getAgentOffers();
            if (res.success) {
                setOffers(res.offers);
            }
        } catch (error) {
            console.error("Failed to load offers", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleAction = async (offerId: string, action: string, amount?: number) => {
        setProcessingId(offerId);
        try {
            const res = await manageOfferAction(offerId, action, amount);
            if (res.success) {
                // Optimistic update
                setOffers(offers.map(o =>
                    o.id === offerId
                        ? { ...o, status: res.new_status as any, counter_amount: amount }
                        : o
                ));
            }
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    const pendingOffers = offers.filter(o => o.status === 'PENDING');
    const activeNegotiations = offers.filter(o => o.status === 'COUNTERED');
    const historyOffers = offers.filter(o => ['ACCEPTED', 'REJECTED'].includes(o.status));

    return (
        <div className="min-h-screen pb-20 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Negotiations</h1>
                <p className="text-gray-500 mt-1">Manage incoming offers and active deals.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLUMN 1: NEW OFFERS */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        New Offers ({pendingOffers.length})
                    </h3>
                    {pendingOffers.map(offer => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            onAction={handleAction}
                            isProcessing={processingId === offer.id}
                        />
                    ))}
                    {pendingOffers.length === 0 && <EmptyState message="No new offers" />}
                </div>

                {/* COLUMN 2: IN NEGOTIATION */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        In Negotiation ({activeNegotiations.length})
                    </h3>
                    {activeNegotiations.map(offer => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            onAction={handleAction}
                            isProcessing={processingId === offer.id}
                        />
                    ))}
                    {activeNegotiations.length === 0 && <EmptyState message="No active negotiations" />}
                </div>

                {/* COLUMN 3: HISTORY */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        History ({historyOffers.length})
                    </h3>
                    {historyOffers.map(offer => (
                        <div key={offer.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-75">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <img src={offer.property_thumbnail} className="w-10 h-10 rounded-lg object-cover grayscale" />
                                    <div>
                                        <div className="font-medium text-gray-900 text-sm">{offer.property_title}</div>
                                        <div className="text-xs text-gray-500">{offer.buyer_name}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${offer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {offer.status}
                                </span>
                            </div>
                            <div className="text-sm font-semibold text-gray-700">
                                {formatCurrency(offer.offer_amount)}
                            </div>
                        </div>
                    ))}
                    {historyOffers.length === 0 && <EmptyState message="No history yet" />}
                </div>

            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            {message}
        </div>
    );
}

function OfferCard({ offer, onAction, isProcessing }: { offer: AgentOffer, onAction: any, isProcessing: boolean }) {
    const [isCountering, setIsCountering] = useState(false);
    const [counterPrice, setCounterPrice] = useState(offer.offer_amount);

    const priceDiff = ((offer.offer_amount - offer.asking_price) / offer.asking_price) * 100;
    const isLowball = priceDiff < -15;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all animate-scale-in">
            {/* Header */}
            <div className="flex gap-3 mb-3">
                <img src={offer.property_thumbnail} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{offer.property_title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <UserIcon className="w-3 h-3" /> {offer.buyer_name}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">Offer</div>
                    <div className="font-bold text-gray-900">{formatCurrency(offer.offer_amount)}</div>
                </div>
            </div>

            {/* Analysis Badge */}
            <div className="flex items-center gap-2 mb-4">
                <div className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${priceDiff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs Ask
                </div>
                {isLowball && (
                    <div className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 font-medium">Low Ball</div>
                )}
                <div className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(offer.submitted_at).toLocaleDateString()}
                </div>
            </div>

            {/* Actions for PENDING */}
            {offer.status === 'PENDING' && !isCountering && (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onAction(offer.id, 'reject')}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Reject
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCountering(true)}
                            disabled={isProcessing}
                            className="flex-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                        >
                            Counter
                        </button>
                        <button
                            onClick={() => onAction(offer.id, 'accept')}
                            disabled={isProcessing}
                            className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            )}

            {/* Counter Input View */}
            {isCountering && (
                <div className="mt-3 bg-amber-50 p-3 rounded-lg animate-fade-in">
                    <label className="text-xs font-medium text-amber-800 block mb-1">Counter Price</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(Number(e.target.value))}
                            className="w-full px-3 py-1.5 rounded border border-amber-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <button
                            onClick={() => onAction(offer.id, 'counter', counterPrice)}
                            disabled={isProcessing}
                            className="bg-amber-600 text-white p-1.5 rounded hover:bg-amber-700"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsCountering(false)}
                            className="text-amber-600 p-1.5 hover:bg-amber-100 rounded"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Status if PROCESSED */}
            {offer.status === 'COUNTERED' && (
                <div className="mt-3 text-xs text-center text-amber-600 font-medium bg-amber-50 py-2 rounded-lg">
                    Countered at {formatCurrency(offer.counter_amount || 0)}
                </div>
            )}
        </div>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    )
}
