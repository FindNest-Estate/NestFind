import React, { useState, useEffect } from 'react';
import { X, CreditCard, ShieldCheck, Lock } from 'lucide-react';
import api from '@/lib/api';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    offerId: number;
    mode?: 'token' | 'final';
    totalPrice?: number;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, amount, offerId, mode = 'token', totalPrice, onSuccess }: PaymentModalProps) {
    const [step, setStep] = useState(1); // 1: Details, 2: Processing, 3: Success
    const [loading, setLoading] = useState(false);

    // Form State
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [name, setName] = useState("");

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCardNumber("");
            setExpiry("");
            setCvv("");
            setName("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStep(2);

        try {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Call API
            if (mode === 'token') {
                await api.transactions.payToken({ offer_id: offerId, amount: amount });
            } else {
                await api.transactions.finalize({ offer_id: offerId, amount: amount });
            }

            setStep(3);
            setTimeout(() => {
                onSuccess();
                onClose();
                setStep(1);
            }, 2000);
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Please try again.");
            setLoading(false);
            setStep(1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-green-400" />
                        <span className="font-semibold tracking-wide">NestFind Secure Gateway</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 && (
                        <form onSubmit={handlePayment}>
                            <div className="mb-6 text-center">
                                {mode === 'final' && totalPrice ? (
                                    <div className="w-full bg-gray-50 p-4 rounded-lg text-sm space-y-2 border border-gray-100 mb-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Sale Price:</span>
                                            <span className="font-medium">₹{totalPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Less Token Paid:</span>
                                            <span>- ₹10,000</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900">
                                            <span>Balance Due:</span>
                                            <span>₹{amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-500 text-sm mb-1">Total Amount to Pay</p>
                                        <h2 className="text-3xl font-bold text-gray-900">₹{amount.toLocaleString()}</h2>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Card Number</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="0000 0000 0000 0000"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Expiry Date</label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">CVV</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                type="password"
                                                placeholder="123"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                                value={cvv}
                                                onChange={(e) => setCvv(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Cardholder Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter name on card"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-8 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                            >
                                <Lock size={16} />
                                {mode === 'final' ? 'Pay Balance & Register' : 'Pay Securely'}
                            </button>

                            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                <Lock size={10} />
                                256-bit SSL Encrypted Payment
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment...</h3>
                            <p className="text-gray-500">Please do not close this window.</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                            <p className="text-gray-500">
                                {mode === 'final'
                                    ? "Property successfully registered in your name."
                                    : "Your token has been paid and property reserved."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
