"use client";

import { Offer, OfferStatus } from "@/lib/types/offer";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getImageUrl } from "@/lib/api";

interface OfferCardProps {
    offer: Offer;
    isSeller?: boolean;
}

export function OfferCard({ offer, isSeller = false }: OfferCardProps) {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: offer.currency,
        maximumFractionDigits: 0
    });

    return (
        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-4 hover:shadow-[var(--shadow-sm)] transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1.5">
                    <StatusBadge status={offer.status} />
                    <h3 className="text-lg font-bold text-[var(--gray-900)]">
                        {formatter.format(offer.amount)}
                        {offer.status === OfferStatus.COUNTERED && (
                            <span className="text-xs font-normal text-[var(--gray-500)] ml-2">(Counter)</span>
                        )}
                    </h3>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-[var(--gray-400)] uppercase tracking-wide">Offer Date</p>
                    <p className="text-sm font-medium text-[var(--gray-700)]">
                        {format(new Date(offer.created_at), "MMM d, yyyy")}
                    </p>
                </div>
            </div>

            {/* Property */}
            <div className="border-t border-[var(--gray-100)] pt-3">
                <div className="flex items-center gap-3">
                    {offer.property?.thumbnail_url && (
                        <img
                            src={getImageUrl(offer.property.thumbnail_url) || ''}
                            alt={offer.property.title}
                            className="w-10 h-10 object-cover rounded-[var(--radius-sm)]"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--gray-900)] truncate">
                            {offer.property?.title}
                        </p>
                        <p className="text-xs text-[var(--gray-500)] truncate">
                            {offer.property?.address}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-3">
                    {isSeller && offer.buyer ? (
                        <p className="text-xs text-[var(--gray-600)]">
                            Buyer: <span className="font-medium text-[var(--gray-900)]">{offer.buyer.full_name}</span>
                        </p>
                    ) : (
                        <div />
                    )}
                    <div className="flex items-center gap-2">
                        {offer.status === OfferStatus.ACCEPTED && !isSeller && (
                            <Link href={`/reservations/${offer.id}/pay`}>
                                <Button size="sm" variant="primary">
                                    Pay Reservation →
                                </Button>
                            </Link>
                        )}
                        <Link
                            href={`/offers/${offer.id}`}
                            className="text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] text-xs font-medium flex items-center gap-1"
                        >
                            Details <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
