"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getOffers } from "@/lib/api/offers";
import { Offer, OfferStatus } from "@/lib/types/offer";
import { OfferCard } from "@/components/OfferCard";
import { Loader2, Home, TrendingUp, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfferStrengthIndicator from "@/components/buyer/OfferStrengthIndicator";

import OfferStatusTracker from "@/components/buyer/OfferStatusTracker";
import OfferActionPanel from "@/components/offers/OfferActionPanel";
import RoleGuard from "@/components/guards/RoleGuard";
import { UserRole } from "@/lib/auth/types";
import DealStatusBadge from "@/components/deals/DealStatusBadge";
import { getCounterDetails } from "@/lib/logic/negotiation";
import NegotiationTimeline, { NegotiationEvent } from "@/components/buyer/NegotiationTimeline";

export default function OffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | OfferStatus>('all');

    useEffect(() => {
        loadOffers();
    }, []);

    async function loadOffers() {
        setIsLoading(true);
        try {
            const data = await getOffers();
            setOffers(data.offers);
            // Auto-select first offer for detail view
            if (data.offers.length > 0 && !selectedOffer) {
                setSelectedOffer(data.offers[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load offers");
        } finally {
            setIsLoading(false);
        }
    }

    const filteredOffers = filterStatus === 'all'
        ? offers
        : offers.filter(o => o.status === filterStatus);

    const statusCounts = {
        all: offers.length,
        PENDING: offers.filter(o => o.status === 'PENDING').length,
        COUNTERED: offers.filter(o => o.status === 'COUNTERED').length,
        ACCEPTED: offers.filter(o => o.status === 'ACCEPTED').length,
        REJECTED: offers.filter(o => o.status === 'REJECTED').length,
        WITHDRAWN: offers.filter(o => o.status === 'WITHDRAWN').length
    };

    // Negotiation events derived from offer state
    const getNegotiationEvents = (offer: Offer): NegotiationEvent[] => {
        const events: NegotiationEvent[] = [
            {
                id: '1',
                type: 'offer',
                title: 'Initial Offer Submitted',
                description: offer.buyer_message || 'You submitted an offer for this property',
                amount: offer.amount,
                timestamp: offer.created_at,
                author: 'buyer'
            }
        ];

        // If countered
        if (offer.status === OfferStatus.COUNTERED) {
            const { possessionDate, cleanMessage } = getCounterDetails(offer.seller_response);
            const desc = possessionDate
                ? `${cleanMessage || 'Seller proposed new terms'}. Proposed Possession: ${possessionDate}`
                : (cleanMessage || 'Seller proposed a counter offer');

            events.push({
                id: '2',
                type: 'counter' as const,
                title: 'Counter Offer Received',
                description: desc,
                amount: offer.counter_price, // Will be undefined if not populated, which is fine
                timestamp: offer.updated_at,
                author: 'seller' as const
            });
        }

        // If accepted
        if (offer.status === OfferStatus.ACCEPTED) {
            events.push({
                id: '3',
                type: 'accepted' as const,
                title: 'Offer Accepted!',
                description: offer.seller_response || 'The seller accepted your offer',
                // amount: offer.amount, // Keep original amount
                timestamp: offer.updated_at,
                author: 'seller' as const
            });
        }

        // If rejected
        if (offer.status === OfferStatus.REJECTED) {
            events.push({
                id: '3',
                type: 'rejected' as const,
                title: 'Offer Declined',
                description: offer.seller_response || 'The seller declined your offer',
                timestamp: offer.updated_at,
                author: 'seller' as const
            });
        }

        return events;
    };

    return (
        <RoleGuard allowedRoles={[UserRole.BUYER, UserRole.SELLER]} fallbackUrl="/dashboard">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20 pb-20">
                <Navbar />

                <div className="max-w-7xl mx-auto px-4 pt-24">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Offers</h1>
                        <p className="text-gray-600">Track and manage your property offers</p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Loading your offers...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="glass-card p-6">
                            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        </div>
                    ) : offers.length === 0 ? (
                        /* Empty State */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 glass-card"
                        >
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Home className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">No offers yet</h2>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                Start your home buying journey by making an offer on a property you love!
                            </p>
                            <Link
                                href="/properties"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                Browse Properties <TrendingUp className="w-5 h-5" />
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Offers List */}
                            <div className="lg:col-span-1">
                                <div className="glass-card p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Filter className="w-5 h-5 text-gray-400" />
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value as any)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm font-medium"
                                        >
                                            <option value="all">All Offers ({statusCounts.all})</option>
                                            <option value="PENDING">Pending ({statusCounts.PENDING})</option>
                                            <option value="COUNTERED">Countered ({statusCounts.COUNTERED})</option>
                                            <option value="ACCEPTED">Accepted ({statusCounts.ACCEPTED})</option>
                                            <option value="REJECTED">Rejected ({statusCounts.REJECTED})</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <AnimatePresence mode="popLayout">
                                        {filteredOffers.map((offer, index) => (
                                            <motion.div
                                                key={offer.id}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => setSelectedOffer(offer)}
                                                className={`cursor-pointer transition-all ${selectedOffer?.id === offer.id
                                                    ? 'ring-2 ring-rose-500'
                                                    : 'hover:shadow-lg'
                                                    }`}
                                            >
                                                <OfferCard offer={offer} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Right: Offer Details */}
                            <div className="lg:col-span-2">
                                <AnimatePresence mode="wait">
                                    {selectedOffer && (
                                        <motion.div
                                            key={selectedOffer.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="space-y-6"
                                        >
                                            {/* Deal Status Badge */}
                                            <div className="flex items-center justify-between">
                                                <DealStatusBadge status={selectedOffer.status} />
                                                <span className="text-sm text-gray-500">
                                                    ID: {selectedOffer.id.slice(0, 8)}
                                                </span>
                                            </div>

                                            {/* Offer Strength Indicator */}
                                            <OfferStrengthIndicator
                                                offerAmount={selectedOffer.amount}
                                                listingPrice={selectedOffer.amount * 0.95} // Mock: assume offer is 5% above listing
                                                marketAverage={selectedOffer.amount * 0.92} // Mock: market average
                                                downPayment={selectedOffer.amount * 0.2} // Mock: 20% down
                                                hasContingencies={true}
                                                closingTimeline={30}
                                                competingOffers={selectedOffer.status === 'COUNTERED' || selectedOffer.status === 'REJECTED' ? 2 : 0}
                                            />

                                            {/* Status Tracker */}
                                            <OfferStatusTracker
                                                currentStatus={selectedOffer.status}
                                                submittedAt={selectedOffer.created_at || new Date().toISOString()}
                                                respondedAt={
                                                    selectedOffer.status !== 'PENDING'
                                                        ? new Date(Date.now() - 43200000).toISOString()
                                                        : undefined
                                                }
                                            />

                                            {/* Actions Panel */}
                                            <OfferActionPanel
                                                offer={selectedOffer}
                                                onUpdate={loadOffers}
                                            />

                                            {/* Negotiation Timeline */}
                                            <NegotiationTimeline
                                                events={getNegotiationEvents(selectedOffer)}
                                                currentStatus={selectedOffer.status}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}
