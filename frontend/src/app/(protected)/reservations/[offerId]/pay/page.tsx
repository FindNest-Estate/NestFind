'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    CreditCard,
    Lock,
    CheckCircle,
    Loader2,
    Building2,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { getOfferById } from '@/lib/api/offers';
import { createReservation } from '@/lib/api/reservations';
import Navbar from '@/components/Navbar';

interface PageParams {
    offerId: string;
}

const RESERVATION_FEE_PERCENT = 0.001; // 0.1%
const RESERVATION_DAYS = 30;

export default function ReservationPaymentPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [offer, setOffer] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Payment form state
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        loadOffer();
    }, [resolvedParams.offerId]);

    const loadOffer = async () => {
        try {
            const result = await getOfferById(resolvedParams.offerId);
            if (result.success && result.offer) {
                if (result.offer.status !== 'ACCEPTED') {
                    setError('This offer is not accepted. Only accepted offers can proceed to reservation.');
                } else {
                    setOffer(result.offer);
                }
            } else {
                setError('Offer not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load offer');
        } finally {
            setLoading(false);
        }
    };

    const reservationFee = offer ? offer.amount * RESERVATION_FEE_PERCENT : 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!cardNumber || !expiry || !cvv || !cardName) {
            alert('Please fill all payment details');
            return;
        }

        setIsProcessing(true);

        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // Mock payment reference
            const paymentReference = `pay_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`;

            const result = await createReservation({
                offer_id: resolvedParams.offerId,
                payment_reference: paymentReference,
                payment_method: 'card'
            });

            if (result.success) {
                setPaymentSuccess(true);
                setTimeout(() => {
                    router.push('/reservations');
                }, 3000);
            } else {
                setError('Failed to create reservation');
            }
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h2>
                    <p className="text-gray-600 mb-4">
                        The property is now reserved for you for {RESERVATION_DAYS} days.
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirecting to your reservations...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !offer) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-md mx-auto px-4 pt-24">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700">{error || 'Something went wrong'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 pt-24 pb-20">
                <div className="grid md:grid-cols-5 gap-8">
                    {/* Order Summary */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Reservation Summary</h2>

                            {/* Property */}
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                                <img
                                    src={offer.property?.thumbnail_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100'}
                                    alt={offer.property?.title}
                                    className="w-16 h-16 rounded-lg object-cover"
                                />
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm">{offer.property?.title}</h3>
                                    <p className="text-xs text-gray-500">{offer.property?.address}</p>
                                </div>
                            </div>

                            {/* Price Breakdown */}
                            <div className="space-y-3 border-t border-gray-100 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Agreed Price</span>
                                    <span className="font-medium">{formatCurrency(offer.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Reservation Fee (0.1%)</span>
                                    <span className="font-medium">{formatCurrency(reservationFee)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                                    <span className="font-bold text-gray-900">Amount to Pay Now</span>
                                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(reservationFee)}</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm">
                                <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-blue-900">Reservation Period: {RESERVATION_DAYS} days</p>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Complete your purchase within this period or the reservation expires (no refund).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="md:col-span-3">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
                                    <p className="text-sm text-gray-500">Secure payment processing</p>
                                </div>
                            </div>

                            <form onSubmit={handlePayment} className="space-y-5">
                                {/* Card Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Card Number
                                    </label>
                                    <input
                                        type="text"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength={19}
                                        placeholder="1234 5678 9012 3456"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>

                                {/* Cardholder Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cardholder Name
                                    </label>
                                    <input
                                        type="text"
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>

                                {/* Expiry & CVV */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Expiry Date
                                        </label>
                                        <input
                                            type="text"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                            maxLength={5}
                                            placeholder="MM/YY"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            CVV
                                        </label>
                                        <input
                                            type="text"
                                            value={cvv}
                                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                            maxLength={4}
                                            placeholder="123"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Test Mode Notice */}
                                <div className="p-4 bg-amber-50 rounded-xl text-sm border border-amber-200">
                                    <p className="font-medium text-amber-900">🧪 Test Mode</p>
                                    <p className="text-amber-700 text-xs mt-1">
                                        This is a demo payment. Use any card details to proceed.
                                    </p>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5" />
                                            Pay {formatCurrency(reservationFee)}
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Your payment is secured with 256-bit SSL encryption
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
