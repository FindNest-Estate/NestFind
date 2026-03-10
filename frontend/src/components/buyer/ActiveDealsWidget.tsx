'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Clock, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { ActiveDeal, ActiveOffer, getActiveDeals, getActiveOffers } from '@/lib/api/buyer';
import { getImageUrl } from '@/lib/api';

export default function ActiveDealsWidget() {
    const [offers, setOffers] = useState<ActiveOffer[]>([]);
    const [deals, setDeals] = useState<ActiveDeal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [offersData, dealsData] = await Promise.all([
                    getActiveOffers(),
                    getActiveDeals()
                ]);
                setOffers(offersData);
                setDeals(dealsData);
            } catch (error) {
                console.error("Failed to fetch active pipeline", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 animate-pulse">
                <div className="h-5 w-48 bg-[var(--gray-200)] rounded mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-[var(--gray-100)] rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const hasItems = offers.length > 0 || deals.length > 0;

    if (!hasItems) {
        return null; // Don't show if pipeline is empty (handled by zero-state in dashboard instead if needed)
    }

    const getOfferStatusConfig = (status: string) => {
        switch (status) {
            case 'PENDING':
                return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', text: 'Offer Sent' };
            case 'COUNTERED':
                return { icon: RefreshCcw, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', text: 'Counter Received' };
            case 'ACCEPTED':
                return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', text: 'Accepted — Pay Deposit' };
            default:
                return { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100', text: status };
        }
    };

    const getDealStatusConfig = (status: string) => {
        switch (status) {
            case 'UNDER_DEAL':
                return { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500', text: 'Active Deal' };
            case 'REGISTRATION_SCHEDULED':
                return { icon: Clock, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-500', text: 'Registration Scheduled' };
            case 'DISPUTED':
                return { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500', text: 'Disputed' };
            default:
                return { icon: Building2, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-400', text: status };
        }
    };

    return (
        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 shadow-sm">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[var(--color-brand)]" />
                    Active Pipeline
                </h2>
                <Link href="/deals" className="text-sm font-medium text-[var(--color-brand)] hover:underline flex items-center">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Active Deals take priority mapping */}
                {deals.map(deal => {
                    const config = getDealStatusConfig(deal.status);
                    const StatusIcon = config.icon;
                    return (
                        <Link href={`/deals/${deal.id}`} key={deal.id} className="group block">
                            <div className={`p-3.5 rounded-xl border-l-[3px] border-t border-r border-b hover:shadow-md transition-all bg-white relative overflow-hidden flex gap-4 items-center ${config.border}`}>
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg bg-[var(--gray-100)] flex-shrink-0 overflow-hidden border border-[var(--gray-200)] relative">
                                    {deal.thumbnail_url ? (
                                        <img src={getImageUrl(deal.thumbnail_url) || ''} alt={deal.property_title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-6 h-6 m-auto mt-4 text-[var(--gray-400)]" />
                                    )}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1 text-xs font-bold uppercase tracking-wide">
                                        <span className={`${config.color}`}>{config.text}</span>
                                    </div>
                                    <h3 className="font-bold text-sm text-[var(--gray-900)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                        {deal.property_title}
                                    </h3>
                                    <div className="text-sm font-medium text-[var(--gray-600)] mt-0.5">
                                        {deal.agreed_price != null ? `₹${deal.agreed_price.toLocaleString('en-IN')}` : 'Price TBD'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Then rendering active pipeline offers */}
                {offers.map(offer => {
                    const config = getOfferStatusConfig(offer.status);
                    const StatusIcon = config.icon;
                    return (
                        <Link href={`/offers/${offer.id}`} key={offer.id} className="group block">
                            <div className={`p-3.5 rounded-xl border border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:shadow-md transition-all bg-white relative overflow-hidden flex gap-4 items-center`}>
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg bg-[var(--gray-100)] flex-shrink-0 overflow-hidden border border-[var(--gray-200)] relative">
                                    {offer.thumbnail_url ? (
                                        <img src={getImageUrl(offer.thumbnail_url) || ''} alt={offer.property_title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <Building2 className="w-6 h-6 m-auto mt-4 text-[var(--gray-400)]" />
                                    )}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className={`flex items-center gap-1.5 mb-1 text-xs font-bold uppercase tracking-wide w-fit px-2 py-0.5 rounded-full ${config.bg} ${config.color} ${config.border} border`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {config.text}
                                    </div>
                                    <h3 className="font-bold text-sm text-[var(--gray-900)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                        {offer.property_title}
                                    </h3>
                                    <div className="text-sm font-medium text-[var(--gray-600)] mt-0.5">
                                        ₹{offer.offered_price.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
