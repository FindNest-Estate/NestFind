"use client";

import { useState } from "react";
import { X, CreditCard, Loader2, Lock, ShieldCheck, Building2, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentGatewayProps {
    amount: number;
    propertyTitle: string;
    onClose: () => void;
    onSuccess: (details: any) => void;
}

export function PaymentGateway({ amount, propertyTitle, onClose, onSuccess }: PaymentGatewayProps) {
    const [method, setMethod] = useState<'CARD' | 'UPI' | 'NET_BANKING'>('UPI');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'PROCESSING' | 'SUCCESS'>('INPUT');

    // Form States
    const [upiId, setUpiId] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [selectedBank, setSelectedBank] = useState("");
    const [accountNo, setAccountNo] = useState(""); // For "Manual Transfer" simulation if needed, or NetBanking ID
    const [ifsc, setIfsc] = useState("");

    const handlePayment = async () => {
        setLoading(true);
        setStep('PROCESSING');

        // Simulate Network Delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        const transactionId = `TXN${Math.floor(Math.random() * 1000000000)}`;

        let meta = {};
        if (method === 'UPI') {
            meta = { upi_id: upiId, provider: 'UPI' };
        } else if (method === 'NET_BANKING') {
            meta = { bank_name: selectedBank, account_number_mask: accountNo.slice(-4), ifsc: ifsc };
        } else {
            meta = { card_last4: cardNumber.slice(-4), network: 'VISA' };
        }

        setStep('SUCCESS');

        setTimeout(() => {
            onSuccess({
                method: method,
                transaction_id: transactionId,
                amount: amount,
                meta: meta
            });
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-green-600" />
                        <span className="font-bold text-gray-700 text-sm">Secure Payment Gateway</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                {step === 'INPUT' && (
                    <div className="flex-1 overflow-y-auto">
                        {/* Summary */}
                        <div className="p-6 bg-blue-600 text-white">
                            <p className="text-blue-100 text-xs uppercase font-bold tracking-wider mb-1">Paying for</p>
                            <h3 className="font-bold text-lg mb-4 truncate">{propertyTitle}</h3>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-blue-200 text-xs">Booking Token Amount</p>
                                    <h2 className="text-3xl font-bold">₹{amount.toLocaleString()}</h2>
                                </div>
                                <ShieldCheck size={40} className="text-blue-400 opacity-50" />
                            </div>
                        </div>

                        {/* Methods */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setMethod('UPI')}
                                className={`flex-1 py-4 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-colors ${method === 'UPI' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Smartphone size={20} />
                                UPI
                            </button>
                            <button
                                onClick={() => setMethod('CARD')}
                                className={`flex-1 py-4 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-colors ${method === 'CARD' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <CreditCard size={20} />
                                Card
                            </button>
                            <button
                                onClick={() => setMethod('NET_BANKING')}
                                className={`flex-1 py-4 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-colors ${method === 'NET_BANKING' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Building2 size={20} />
                                NetBanking
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-6 space-y-4">
                            {method === 'UPI' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <label className="block">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Enter UPI ID</span>
                                        <input
                                            type="text"
                                            placeholder="username@okaxis"
                                            value={upiId}
                                            onChange={e => setUpiId(e.target.value)}
                                            className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </label>
                                    <div className="flex gap-2 justify-center py-4">
                                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                                        <span className="text-xs text-gray-400 flex items-center">Powered by BHIM UPI</span>
                                    </div>
                                </div>
                            )}

                            {method === 'CARD' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <label className="block">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Card Number</span>
                                        <input
                                            type="text"
                                            placeholder="0000 0000 0000 0000"
                                            maxLength={19}
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value)}
                                            className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="block flex-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Expiry</span>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                value={expiry}
                                                onChange={e => setExpiry(e.target.value)}
                                                className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </label>
                                        <label className="block w-24">
                                            <span className="text-xs font-bold text-gray-500 uppercase">CVV</span>
                                            <input
                                                type="password"
                                                placeholder="123"
                                                maxLength={3}
                                                value={cvv}
                                                onChange={e => setCvv(e.target.value)}
                                                className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {method === 'NET_BANKING' && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <label className="block">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Select Bank</span>
                                        <select
                                            value={selectedBank}
                                            onChange={e => setSelectedBank(e.target.value)}
                                            className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                                        >
                                            <option value="">Select Bank</option>
                                            <option value="HDFC">HDFC Bank</option>
                                            <option value="SBI">State Bank of India</option>
                                            <option value="ICICI">ICICI Bank</option>
                                            <option value="AXIS">Axis Bank</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Account Number</span>
                                        <input
                                            type="text"
                                            placeholder="Enter Account Number"
                                            value={accountNo}
                                            onChange={e => setAccountNo(e.target.value)}
                                            className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-bold text-gray-500 uppercase">IFSC Code</span>
                                        <input
                                            type="text"
                                            placeholder="Enter IFSC Code"
                                            value={ifsc}
                                            onChange={e => setIfsc(e.target.value.toUpperCase())}
                                            className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100">
                            <button
                                onClick={handlePayment}
                                disabled={
                                    (method === 'UPI' && !upiId) ||
                                    (method === 'CARD' && (!cardNumber || !expiry || !cvv)) ||
                                    (method === 'NET_BANKING' && (!selectedBank || !accountNo || !ifsc))
                                }
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Pay ₹{amount.toLocaleString()}
                            </button>
                            <div className="mt-4 flex justify-center items-center gap-2 text-xs text-gray-400">
                                <Lock size={10} />
                                256-bit SSL Encrypted
                            </div>
                        </div>
                    </div>
                )}

                {step === 'PROCESSING' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="relative mb-6">
                            <div className="h-20 w-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShieldCheck size={24} className="text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment...</h3>
                        <p className="text-gray-500">Please do not close this window</p>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                        <p className="text-gray-500 mb-8">Redirecting back to deal room...</p>
                    </div>
                )}

            </div>
        </div>
    );
}
