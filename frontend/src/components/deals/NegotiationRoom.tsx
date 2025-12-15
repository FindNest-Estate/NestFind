"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Check, X, MessageSquare, TrendingUp, Clock, AlertCircle, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

interface NegotiationRoomProps {
    deal: any;
    isBuyer: boolean;
    isAgent: boolean;
    onUpdate: () => void;
}

export function NegotiationRoom({ deal, isBuyer, isAgent, onUpdate }: NegotiationRoomProps) {
    const [loading, setLoading] = useState(false);
    const [counterAmount, setCounterAmount] = useState("");
    const [showCounter, setShowCounter] = useState(false);
    const [rejectDialog, setRejectDialog] = useState(false);

    const isPending = deal.status === 'pending';
    const isCountered = deal.status === 'countered';
    const isRejected = deal.status === 'rejected';

    // Buyer Logic
    const buyerCanAct = isBuyer && isCountered;
    const buyerWaiting = isBuyer && isPending;

    // Agent Logic
    const agentCanAct = isAgent && isPending;
    const agentWaiting = isAgent && isCountered;

    const canAct = buyerCanAct || agentCanAct;

    const handleAction = async (action: string, payload?: any) => {
        setLoading(true);
        try {
            if (action === 'ACCEPT') {
                await api.offers.update(deal.id, { status: 'accepted' });
                toast.success("Offer Accepted! Proceeding to next steps.");
            } else if (action === 'REJECT') {
                await api.offers.update(deal.id, { status: 'rejected' });
                toast.success("Offer Rejected.");
            } else if (action === 'COUNTER') {
                const newStatus = isBuyer ? 'pending' : 'countered';
                await api.offers.update(deal.id, {
                    status: newStatus,
                    amount: parseFloat(payload.amount)
                });
                toast.success("Counter offer sent successfully!");
                setShowCounter(false);
            }
            onUpdate();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update offer");
        } finally {
            setLoading(false);
            setRejectDialog(false);
        }
    };

    if (isRejected) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                    <X size={28} strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Offer Rejected</h2>
                <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
                    This negotiation has been closed. You may try making a new offer on the property page or contact the agent directly.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Card - Clean Professional Design */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5
                                    ${buyerCanAct || agentCanAct ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                    {buyerCanAct || agentCanAct ? <AlertCircle size={12} strokeWidth={2} /> : <Clock size={12} strokeWidth={2} />}
                                    {buyerCanAct || agentCanAct ? "Action Required" : "Waiting for Response"}
                                </span>
                                <span className="text-gray-400 text-xs">
                                    Updated {new Date(deal.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm text-gray-400 font-medium">Current Offer</span>
                            </div>
                            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mt-1">
                                ₹{deal.amount.toLocaleString()}
                            </h2>
                            <p className="text-gray-500 mt-2 text-sm">
                                {isPending ? "Buyer's offer is pending review" : "Counter offer is on the table"}
                            </p>
                        </div>

                        {/* Turn Indicator - Minimal Design */}
                        <div className="flex items-center gap-4 bg-gray-50 px-5 py-4 rounded-xl border border-gray-100">
                            <div className={`text-center transition-opacity ${buyerCanAct || buyerWaiting ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="text-xs font-medium text-gray-600 mb-1.5">Buyer</div>
                                <div className={`h-1 w-10 mx-auto rounded-full transition-all ${buyerCanAct ? 'bg-amber-500' : 'bg-gray-200'}`} />
                            </div>
                            <ArrowRight size={16} className="text-gray-300" strokeWidth={1.5} />
                            <div className={`text-center transition-opacity ${agentCanAct || agentWaiting ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="text-xs font-medium text-gray-600 mb-1.5">Agent</div>
                                <div className={`h-1 w-10 mx-auto rounded-full transition-all ${agentCanAct ? 'bg-amber-500' : 'bg-gray-200'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Area */}
                {canAct && (
                    <div className="bg-gray-50/50 px-8 py-6 border-t border-gray-100">
                        {!showCounter ? (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleAction('ACCEPT')}
                                    disabled={loading}
                                    className="flex-1 min-w-[140px] bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} strokeWidth={2} /> Accept Offer
                                </button>
                                <button
                                    onClick={() => setShowCounter(true)}
                                    disabled={loading}
                                    className="flex-1 min-w-[140px] bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <TrendingUp size={16} strokeWidth={1.5} /> Counter
                                </button>
                                <button
                                    onClick={() => setRejectDialog(true)}
                                    disabled={loading}
                                    className="px-5 py-3 text-rose-600 font-medium hover:bg-rose-50 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    <X size={16} strokeWidth={1.5} /> Decline
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-900">Propose New Amount</h3>
                                    <button onClick={() => setShowCounter(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition">
                                        <X size={18} strokeWidth={1.5} />
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                        <input
                                            type="number"
                                            value={counterAmount}
                                            onChange={(e) => setCounterAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl font-medium text-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleAction('COUNTER', { amount: counterAmount })}
                                        disabled={!counterAmount || loading}
                                        className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Send Counter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Waiting State */}
                {!canAct && (
                    <div className="bg-blue-50/30 px-8 py-5 border-t border-blue-50 flex items-center gap-3 text-blue-700">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="font-medium text-sm">Waiting for the other party to respond...</span>
                    </div>
                )}
            </div>

            {/* Context Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                    <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                        <div className="p-1 bg-green-50 rounded-lg">
                            <Shield size={14} className="text-green-600" strokeWidth={1.5} />
                        </div>
                        Buyer Protection
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Funds are not transferred until both parties agree. The booking token is fully refundable within 24 hours of payment.
                    </p>
                </div>
                <div className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                    <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                        <div className="p-1 bg-indigo-50 rounded-lg">
                            <MessageSquare size={14} className="text-indigo-600" strokeWidth={1.5} />
                        </div>
                        Negotiation Tips
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Fair market value for this area is around ₹{(deal.amount * 1.05).toLocaleString()}. Keep offers competitive to close faster.
                    </p>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={rejectDialog}
                onClose={() => setRejectDialog(false)}
                onConfirm={() => handleAction('REJECT')}
                title="Reject Offer"
                message="Are you sure you want to reject this offer? This will end the negotiation."
                variant="danger"
            />
        </div>
    );
}
