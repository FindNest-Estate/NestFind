'use client';

import { Suspense, use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getOfferById } from "@/lib/api/offers";
import { createReservation } from "@/lib/api/reservations";
import { Offer } from "@/lib/types/offer";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default function CreateReservationPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReservationContent searchParams={searchParams} />
        </Suspense>
    );
}

function ReservationContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const resolvedSearchParams = use(searchParams);
    const router = useRouter();
    const offerId = resolvedSearchParams.offer_id;

    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (offerId) {
            getOfferById(offerId)
                .then(data => setOffer(data.offer))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [offerId]);

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            // 1. Simulate Payment Delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 2. Generate Mock Payment Reference
            const mockPaymentRef = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // 3. Call Backend
            await createReservation({
                offer_id: offerId!,
                payment_reference: mockPaymentRef,
                payment_method: 'MOCK_CARD'
            });

            // 4. Success Toast/Redirect
            alert("Payment Successful! Reservation Confirmed.");
            router.push('/reservations');

        } catch (err: any) {
            alert(err.message || "Payment Failed");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen pt-32 text-center">Loading offer details...</div>;
    if (!offer) return <div className="min-h-screen pt-32 text-center">Invalid Offer</div>;

    const reservationAmount = offer.amount * 0.001; // 0.1%

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 pt-24">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
                            <Lock className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Secure Reservation</h1>
                        <p className="text-gray-500 mt-2">Complete payment to reserve {offer.property?.title}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Property Price</span>
                                <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(offer.amount)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-gray-900 border-t pt-3">
                                <span>Reservation Fee (0.1%)</span>
                                <span className="text-emerald-700 text-lg">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(reservationAmount)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Fully refundable if transaction is cancelled by seller.
                            </p>
                        </div>

                        {/* Mock Payment Form */}
                        <div className="border border-gray-200 rounded-xl p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
                            <div className="flex gap-2">
                                <input disabled value="4242" className="bg-gray-100 rounded p-2 w-16 text-center text-gray-500" />
                                <input disabled value="****" className="bg-gray-100 rounded p-2 flex-1 text-center text-gray-500" />
                                <input disabled value="4242" className="bg-gray-100 rounded p-2 w-16 text-center text-gray-500" />
                            </div>
                            <p className="text-xs text-blue-500 mt-2">Test Mode: Any payment will succeed.</p>
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {isProcessing ? (
                                "Processing Secure Payment..."
                            ) : (
                                <>Pay {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(reservationAmount)} <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
