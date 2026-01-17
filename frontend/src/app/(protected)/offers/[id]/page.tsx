"use client";

import { useState, useEffect, use } from "react";
import { getOfferById, withdrawOffer, acceptOffer } from "@/lib/api/offers";
import { Offer, OfferStatus } from "@/lib/types/offer";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/authApi";

interface PageParams {
    id: string;
}

export default function OfferDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [resolvedParams.id]);

    async function loadData() {
        try {
            const [offerData, userData] = await Promise.all([
                getOfferById(resolvedParams.id),
                getCurrentUser()
            ]);
            setOffer(offerData.offer);
            setCurrentUser(userData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleWithdraw = async () => {
        if (!confirm("Are you sure?")) return;
        setIsActionLoading(true);
        try {
            await withdrawOffer(resolvedParams.id);
            loadData();
        } catch (err) { alert("Failed to withdraw"); }
        finally { setIsActionLoading(false); }
    };

    const handleAccept = async () => {
        if (!confirm("Accepting this offer will start the reservation process.")) return;
        setIsActionLoading(true);
        try {
            await acceptOffer(resolvedParams.id);
            loadData();
        } catch (err) { alert("Failed to accept"); }
        finally { setIsActionLoading(false); }
    };

    if (isLoading) return <div className="min-h-screen"><Navbar /><div className="pt-32 text-center">Loading...</div></div>;
    if (!offer) return <div>Not found</div>;

    const isSeller = currentUser?.role === 'SELLER';
    const isBuyer = currentUser?.role === 'BUYER';

    const canWithdraw = isBuyer && (offer.status === OfferStatus.PENDING || offer.status === OfferStatus.COUNTERED);
    const canAccept = isSeller && offer.status === OfferStatus.PENDING;
    const canProceedToReservation = isBuyer && (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.COUNTERED);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 pt-24">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <div className="text-center mb-8">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium mb-4 inline-block">
                            {offer.status}
                        </span>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: offer.currency }).format(offer.amount)}
                        </h1>
                        <p className="text-gray-500">Offered for {offer.property?.title}</p>
                    </div>

                    <div className="space-y-6 max-w-lg mx-auto">

                        {/* Negotiation History / Status Message */}
                        {offer.status === OfferStatus.COUNTERED && (
                            <div className="bg-purple-50 p-4 rounded-xl text-center">
                                <p className="font-semibold text-purple-900">Seller Countered</p>
                                <p className="text-purple-700">
                                    Seller wants: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: offer.currency }).format(offer.amount)}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid gap-3">
                            {canAccept && (
                                <button
                                    onClick={handleAccept}
                                    disabled={isActionLoading}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                                >
                                    Accept Offer
                                </button>
                            )}

                            {canProceedToReservation && (
                                <button
                                    onClick={() => router.push(`/reservations/create?offer_id=${offer.id}`)}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                                >
                                    Proceed to Payment <ArrowRight className="w-4 h-4" />
                                </button>
                            )}

                            {canWithdraw && (
                                <button
                                    onClick={handleWithdraw}
                                    disabled={isActionLoading}
                                    className="w-full py-3 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50"
                                >
                                    Withdraw Offer
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
