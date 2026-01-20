"use client";

import { useState, useEffect, use } from "react";
import {
    getTransactionById,
    sendBuyerOtp,
    verifyBuyerOtp,
    sendSellerOtp,
    verifySellerOtp,
    completeTransaction
} from "@/lib/api/transactions";
import { Transaction, TransactionStatus } from "@/lib/types/transaction";
import {
    Loader2, MapPin, Calendar, CheckCircle2, Clock, Send,
    User, Building, Shield, AlertCircle, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface PageParams {
    id: string;
}

const STEP_CONFIG = {
    INITIATED: { step: 1, label: "Verify Buyer" },
    BUYER_VERIFIED: { step: 2, label: "Verify Seller" },
    SELLER_VERIFIED: { step: 3, label: "Complete Transaction" },
    COMPLETED: { step: 4, label: "Completed" },
    FAILED: { step: 1, label: "Failed" },
    CANCELLED: { step: 1, label: "Cancelled" },
};

export default function RegistrationDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // OTP states
    const [buyerOtp, setBuyerOtp] = useState("");
    const [sellerOtp, setSellerOtp] = useState("");
    const [sendingBuyerOtp, setSendingBuyerOtp] = useState(false);
    const [sendingSellerOtp, setSendingSellerOtp] = useState(false);
    const [verifyingBuyerOtp, setVerifyingBuyerOtp] = useState(false);
    const [verifyingSellerOtp, setVerifyingSellerOtp] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadTransaction();
    }, [resolvedParams.id]);

    async function loadTransaction() {
        try {
            const data = await getTransactionById(resolvedParams.id);
            if (data.success && data.transaction) {
                setTransaction(data.transaction);
            } else {
                setError("Transaction not found");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load transaction");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSendBuyerOtp() {
        setSendingBuyerOtp(true);
        setActionMessage(null);
        try {
            const result = await sendBuyerOtp(resolvedParams.id);
            if (result.success) {
                setActionMessage({ type: 'success', text: result.message || "OTP sent to buyer" });
            } else {
                setActionMessage({ type: 'error', text: "Failed to send OTP" });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || "Failed to send OTP" });
        } finally {
            setSendingBuyerOtp(false);
        }
    }

    async function handleVerifyBuyerOtp() {
        if (buyerOtp.length !== 6) {
            setActionMessage({ type: 'error', text: "OTP must be 6 digits" });
            return;
        }
        setVerifyingBuyerOtp(true);
        setActionMessage(null);
        try {
            const result = await verifyBuyerOtp(resolvedParams.id, buyerOtp);
            if (result.success) {
                setActionMessage({ type: 'success', text: "Buyer verified!" });
                setBuyerOtp("");
                loadTransaction();
            } else {
                setActionMessage({ type: 'error', text: "Invalid OTP" });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || "Verification failed" });
        } finally {
            setVerifyingBuyerOtp(false);
        }
    }

    async function handleSendSellerOtp() {
        setSendingSellerOtp(true);
        setActionMessage(null);
        try {
            const result = await sendSellerOtp(resolvedParams.id);
            if (result.success) {
                setActionMessage({ type: 'success', text: result.message || "OTP sent to seller" });
            } else {
                setActionMessage({ type: 'error', text: "Failed to send OTP" });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || "Failed to send OTP" });
        } finally {
            setSendingSellerOtp(false);
        }
    }

    async function handleVerifySellerOtp() {
        if (sellerOtp.length !== 6) {
            setActionMessage({ type: 'error', text: "OTP must be 6 digits" });
            return;
        }
        setVerifyingSellerOtp(true);
        setActionMessage(null);
        try {
            const result = await verifySellerOtp(resolvedParams.id, sellerOtp);
            if (result.success) {
                setActionMessage({ type: 'success', text: "Seller verified!" });
                setSellerOtp("");
                loadTransaction();
            } else {
                setActionMessage({ type: 'error', text: "Invalid OTP" });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || "Verification failed" });
        } finally {
            setVerifyingSellerOtp(false);
        }
    }

    async function handleComplete() {
        if (!confirm("Complete this transaction? This will mark the property as SOLD.")) return;
        setCompleting(true);
        setActionMessage(null);
        try {
            // Get GPS if available
            const gps = { lat: null as number | null, lng: null as number | null };
            if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    gps.lat = position.coords.latitude;
                    gps.lng = position.coords.longitude;
                } catch {
                    // GPS not available, continue without it
                }
            }

            const result = await completeTransaction(resolvedParams.id);
            if (result.success) {
                setActionMessage({ type: 'success', text: "Transaction completed successfully!" });
                loadTransaction();
            } else {
                setActionMessage({ type: 'error', text: "Failed to complete transaction" });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || "Failed to complete" });
        } finally {
            setCompleting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex justify-center pt-32">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-3xl mx-auto px-4 pt-24">
                    <div className="bg-red-50 text-red-700 p-6 rounded-xl">
                        {error || "Transaction not found"}
                    </div>
                </div>
            </div>
        );
    }

    const currentStep = STEP_CONFIG[transaction.status]?.step || 1;
    const isCompleted = transaction.status === TransactionStatus.COMPLETED;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 pt-24">
                {/* Back link */}
                <Link
                    href="/agent/registrations"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Registrations
                </Link>

                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {transaction.display_status || transaction.status}
                            </span>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {transaction.property?.title || transaction.property_title}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-gray-500">
                                {transaction.registration_location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {transaction.registration_location}
                                    </span>
                                )}
                                {transaction.registration_date && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {format(new Date(transaction.registration_date), "PPP 'at' p")}
                                    </span>
                                )}
                            </div>
                        </div>
                        {isCompleted && (
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 flex-shrink-0" />
                        )}
                    </div>

                    {/* Price & Commission */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                        <div>
                            <p className="text-sm text-gray-500">Transaction Value</p>
                            <p className="text-xl font-bold text-gray-900">
                                ₹{(transaction.total_price || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Your Commission</p>
                            <p className="text-xl font-bold text-emerald-600">
                                ₹{(transaction.agent_commission || transaction.commission || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                {!isCompleted && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Verification Progress</h2>
                        <div className="flex items-center">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex-1 flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step < currentStep
                                        ? 'bg-emerald-500 text-white'
                                        : step === currentStep
                                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
                                    </div>
                                    {step < 3 && (
                                        <div className={`flex-1 h-1 mx-2 ${step < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>Buyer OTP</span>
                            <span>Seller OTP</span>
                            <span>Complete</span>
                        </div>
                    </div>
                )}

                {/* Action Message */}
                {actionMessage && (
                    <div className={`p-4 rounded-xl mb-6 ${actionMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                        }`}>
                        {actionMessage.text}
                    </div>
                )}

                {/* Parties Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* Buyer Card */}
                    <div className={`bg-white rounded-xl border p-5 ${transaction.buyer?.verified
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-gray-200'
                        }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Buyer</p>
                                <p className="font-medium text-gray-900">
                                    {transaction.buyer?.name || transaction.buyer_name}
                                </p>
                            </div>
                            {transaction.buyer?.verified && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                            )}
                        </div>

                        {/* Buyer OTP section - only show if INITIATED */}
                        {transaction.status === TransactionStatus.INITIATED && (
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleSendBuyerOtp}
                                    disabled={sendingBuyerOtp}
                                    className="w-full mb-3 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sendingBuyerOtp ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send OTP to Buyer
                                </button>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={buyerOtp}
                                        onChange={(e) => setBuyerOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center tracking-widest font-mono"
                                        maxLength={6}
                                    />
                                    <button
                                        onClick={handleVerifyBuyerOtp}
                                        disabled={verifyingBuyerOtp || buyerOtp.length !== 6}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {verifyingBuyerOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seller Card */}
                    <div className={`bg-white rounded-xl border p-5 ${transaction.seller?.verified
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-gray-200'
                        }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Building className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Seller</p>
                                <p className="font-medium text-gray-900">
                                    {transaction.seller?.name || transaction.seller_name}
                                </p>
                            </div>
                            {transaction.seller?.verified && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                            )}
                        </div>

                        {/* Seller OTP section - only show if BUYER_VERIFIED */}
                        {transaction.status === TransactionStatus.BUYER_VERIFIED && (
                            <div className="pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleSendSellerOtp}
                                    disabled={sendingSellerOtp}
                                    className="w-full mb-3 py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sendingSellerOtp ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send OTP to Seller
                                </button>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={sellerOtp}
                                        onChange={(e) => setSellerOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center tracking-widest font-mono"
                                        maxLength={6}
                                    />
                                    <button
                                        onClick={handleVerifySellerOtp}
                                        disabled={verifyingSellerOtp || sellerOtp.length !== 6}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {verifyingSellerOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Complete Transaction Button */}
                {transaction.status === TransactionStatus.SELLER_VERIFIED && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <Shield className="w-10 h-10" />
                            <div>
                                <h3 className="text-lg font-bold">All Parties Verified!</h3>
                                <p className="text-white/80">Ready to complete the transaction</p>
                            </div>
                        </div>
                        <button
                            onClick={handleComplete}
                            disabled={completing}
                            className="w-full py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {completing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            Complete Transaction
                        </button>
                    </div>
                )}

                {/* Completed State */}
                {isCompleted && (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-6 text-white text-center">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">Transaction Complete!</h3>
                        <p className="text-white/80 mb-4">
                            Property has been marked as SOLD
                        </p>
                        {transaction.completed_at && (
                            <p className="text-sm text-white/60">
                                Completed on {format(new Date(transaction.completed_at), "PPP 'at' p")}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
