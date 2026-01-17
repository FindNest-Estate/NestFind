"use client";

import { useState, useEffect } from "react";
import { getOffers } from "@/lib/api/offers";
import { Offer, OfferStatus } from "@/lib/types/offer";
import { OfferCard } from "@/components/OfferCard";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function OffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadOffers();
    }, []);

    async function loadOffers() {
        setIsLoading(true);
        try {
            const data = await getOffers();
            setOffers(data.offers);
        } catch (err: any) {
            setError(err.message || "Failed to load offers");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">My Offers</h1>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
                ) : offers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">You haven't made any offers yet.</p>
                        <Link
                            href="/properties"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            Browse Properties
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {offers.map(offer => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
