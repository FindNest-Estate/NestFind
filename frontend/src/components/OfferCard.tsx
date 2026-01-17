"use client";

import { Offer, OfferStatus } from "@/lib/types/offer";
import Link from "next/link";
import { format } from "date-fns";

interface OfferCardProps {
    offer: Offer;
    isSeller?: boolean;
}

export function OfferCard({ offer, isSeller = false }: OfferCardProps) {
    const statusColor = {
        [OfferStatus.PENDING]: "bg-yellow-100 text-yellow-800",
        [OfferStatus.ACCEPTED]: "bg-green-100 text-green-800",
        [OfferStatus.REJECTED]: "bg-red-100 text-red-800",
        [OfferStatus.COUNTERED]: "bg-purple-100 text-purple-800",
        [OfferStatus.EXPIRED]: "bg-gray-100 text-gray-500",
        [OfferStatus.WITHDRAWN]: "bg-gray-100 text-gray-600",
    }[offer.status];

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: offer.currency,
        maximumFractionDigits: 0
    });

    return (
        <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition bg-white block">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                    <span className={`self-start px-2 py-1 rounded text-xs font-semibold ${statusColor} mb-2`}>
                        {offer.status}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">
                        {formatter.format(offer.amount)}
                        {offer.status === OfferStatus.COUNTERED && (
                            <span className="text-xs font-normal text-gray-500 ml-2">
                                (Counter-offer)
                            </span>
                        )}
                    </h3>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Offer Date</p>
                    <p className="text-sm font-medium text-gray-700">
                        {format(new Date(offer.created_at), "MMM d, yyyy")}
                    </p>
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                    {offer.property?.thumbnail_url && (
                        <img
                            src={offer.property.thumbnail_url}
                            alt={offer.property.title}
                            className="w-12 h-12 object-cover rounded"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {offer.property?.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {offer.property?.address}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    {isSeller && offer.buyer ? (
                        <p className="text-sm text-gray-600">
                            Buyer: <span className="font-medium text-gray-900">{offer.buyer.full_name}</span>
                        </p>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        {offer.status === OfferStatus.ACCEPTED && !isSeller && (
                            <Link
                                href={`/reservations/${offer.id}/pay`}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                            >
                                Pay Reservation →
                            </Link>
                        )}
                        <Link
                            href={`/offers/${offer.id}`}
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                        >
                            Details →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
