"use client";

import { useState } from "react";
import { X, DollarSign, Calendar, MessageSquare, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { counterOffer } from "@/lib/api/offers";

interface CounterOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    offerId: string;
    currentPrice: number;
    buyerName: string;
}

export default function CounterOfferModal({
    isOpen,
    onClose,
    onSuccess,
    offerId,
    currentPrice,
    buyerName
}: CounterOfferModalProps) {
    const [counterPrice, setCounterPrice] = useState<string>('');
    const [possessionDate, setPossessionDate] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Serialize possession date into message
            let finalMessage = message.trim();
            if (possessionDate) {
                finalMessage += ` [Possession: ${possessionDate}]`;
            }

            const cleanPrice = parseFloat(counterPrice.replace(/[^0-9.]/g, ''));
            if (isNaN(cleanPrice) || cleanPrice <= 0) {
                throw new Error("Please enter a valid counter price");
            }

            await counterOffer(offerId, cleanPrice, finalMessage);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to submit counter offer");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Counter Offer</h2>
                            <p className="text-xs text-purple-700 font-medium"> responding to {buyerName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Context */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-semibold">Current Offer</span>
                                <p className="text-lg font-bold text-gray-900">
                                    ${currentPrice.toLocaleString()}
                                </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                            <div className="text-right">
                                <span className="text-xs text-purple-600 uppercase font-semibold">Your Counter</span>
                                <p className="text-lg font-bold text-purple-700">
                                    {counterPrice ? `$${parseFloat(counterPrice).toLocaleString()}` : '---'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Counter Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Counter Price ($) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        required
                                        value={counterPrice}
                                        onChange={(e) => setCounterPrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Enter amount"
                                    />
                                </div>
                            </div>

                            {/* Possession Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Proposed Possession Date
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={possessionDate}
                                        onChange={(e) => setPossessionDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Optional. Will be sent as structured data in the message.
                                </p>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message to Buyer
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Explain your counter offer..."
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-200"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Counter Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
