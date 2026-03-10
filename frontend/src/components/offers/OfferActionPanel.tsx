"use client";

import { useState } from "react";
import { Offer } from "@/lib/types/offer";
import { useAuth } from "@/lib/auth";
import { UserRole } from "@/lib/auth/types";
import {
    canCounter,
    canAccept,
    canReject,
    canWithdraw
} from "@/lib/logic/negotiation";
import { acceptOffer, rejectOffer, withdrawOffer } from "@/lib/api/offers";
import { Loader2, CheckCircle2, XCircle, ArrowRight, Ban } from "lucide-react";
import CounterOfferModal from "./CounterOfferModal";
import { useRouter } from "next/navigation";

interface OfferActionPanelProps {
    offer: Offer;
    onUpdate: () => void;
}

export default function OfferActionPanel({ offer, onUpdate }: OfferActionPanelProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null); // 'accept', 'reject', 'withdraw'

    if (!user) return null;

    const role = user.role;

    // Permissions
    const showCounter = canCounter(offer, role);
    const showAccept = canAccept(offer, role);
    const showReject = canReject(offer, role);
    const showWithdraw = canWithdraw(offer, role);

    if (!showCounter && !showAccept && !showReject && !showWithdraw) {
        return null;
    }

    const handleAccept = async () => {
        if (!window.confirm("Are you sure you want to ACCEPT this offer? This will lock the deal.")) return;
        setIsLoading('accept');
        try {
            await acceptOffer(offer.id);
            onUpdate();
        } catch (error) {
            console.error("Failed to accept offer:", error);
            alert("Failed to accept offer. Please try again.");
        } finally {
            setIsLoading(null);
        }
    };

    const handleReject = async () => {
        if (!window.confirm("Are you sure you want to REJECT this offer? This action cannot be undone.")) return;
        setIsLoading('reject');
        try {
            await rejectOffer(offer.id, "Rejected by user");
            onUpdate();
        } catch (error) {
            console.error("Failed to reject offer:", error);
            alert("Failed to reject offer.");
        } finally {
            setIsLoading(null);
        }
    };

    const handleWithdraw = async () => {
        if (!window.confirm("Are you sure you want to WITHDRAW this offer?")) return;
        setIsLoading('withdraw');
        try {
            await withdrawOffer(offer.id);
            onUpdate();
        } catch (error) {
            console.error("Failed to withdraw offer:", error);
            alert("Failed to withdraw offer.");
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                Available Actions
            </h3>

            <div className="flex flex-wrap gap-3">
                {/* Counter Offer */}
                {showCounter && (
                    <>
                        <button
                            onClick={() => setIsCounterModalOpen(true)}
                            disabled={!!isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Counter Offer
                        </button>
                        <CounterOfferModal
                            isOpen={isCounterModalOpen}
                            onClose={() => setIsCounterModalOpen(false)}
                            onSuccess={onUpdate}
                            offerId={offer.id}
                            currentPrice={offer.amount}
                            buyerName={offer.buyer?.full_name || "Buyer"}
                        />
                    </>
                )}

                {/* Accept */}
                {showAccept && (
                    <button
                        onClick={handleAccept}
                        disabled={!!isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50"
                    >
                        {isLoading === 'accept' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        Accept Offer
                    </button>
                )}

                {/* Reject */}
                {showReject && (
                    <button
                        onClick={handleReject}
                        disabled={!!isLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition font-medium disabled:opacity-50"
                    >
                        {isLoading === 'reject' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        Reject
                    </button>
                )}

                {/* Withdraw */}
                {showWithdraw && (
                    <button
                        onClick={handleWithdraw}
                        disabled={!!isLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 bg-white rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                    >
                        {isLoading === 'withdraw' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Ban className="w-4 h-4" />
                        )}
                        Withdraw
                    </button>
                )}
            </div>
        </div>
    );
}
