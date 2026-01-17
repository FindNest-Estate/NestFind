'use client';

import { useState } from 'react';
import { X, DollarSign, Send, Loader2 } from 'lucide-react';
import { createOffer } from '@/lib/api/offers';

interface MakeOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    propertyId: string;
    propertyTitle: string;
    propertyPrice: number;
    visitId?: string;
}

export default function MakeOfferModal({
    isOpen,
    onClose,
    onSuccess,
    propertyId,
    propertyTitle,
    propertyPrice,
    visitId
}: MakeOfferModalProps) {
    const [offerAmount, setOfferAmount] = useState<string>(propertyPrice.toString());
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const amount = parseFloat(offerAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid offer amount');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createOffer({
                property_id: propertyId,
                amount,
                buyer_message: message || undefined
            });

            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError('Failed to create offer');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create offer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const offerValue = parseFloat(offerAmount) || 0;
    const percentOfAsking = propertyPrice > 0 ? ((offerValue / propertyPrice) * 100).toFixed(1) : '0';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Make an Offer</h2>
                        <p className="text-sm text-gray-500 truncate max-w-[250px]">{propertyTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* Property Price Reference */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500">Asking Price</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(propertyPrice)}</p>
                    </div>

                    {/* Offer Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Offer Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                            <input
                                type="number"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Enter amount"
                                min="1"
                                step="1000"
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            {percentOfAsking}% of asking price
                            {offerValue < propertyPrice ? (
                                <span className="text-amber-600 ml-2">
                                    ({formatCurrency(propertyPrice - offerValue)} below asking)
                                </span>
                            ) : offerValue > propertyPrice ? (
                                <span className="text-emerald-600 ml-2">
                                    ({formatCurrency(offerValue - propertyPrice)} above asking)
                                </span>
                            ) : (
                                <span className="text-blue-600 ml-2">(At asking price)</span>
                            )}
                        </p>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message to Agent (Optional)
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            rows={3}
                            placeholder="Add any notes about your offer..."
                        />
                    </div>

                    {/* Reservation Info */}
                    <div className="bg-blue-50 rounded-xl p-4 text-sm">
                        <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                        <ul className="text-blue-700 space-y-1 text-xs">
                            <li>• Agent will review your offer within 48 hours</li>
                            <li>• They may accept, reject, or counter with a new price</li>
                            <li>• If accepted, you'll pay a 0.1% reservation fee to secure the property</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !offerAmount}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Offer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
