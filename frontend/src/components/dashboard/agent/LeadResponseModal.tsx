"use client";

import { useState } from "react";
import { X, Check, DollarSign, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface LeadResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: any; // Ideally types from API
    onSuccess: () => void;
}

export default function LeadResponseModal({ isOpen, onClose, request, onSuccess }: LeadResponseModalProps) {
    const [commissionRate, setCommissionRate] = useState<string>("2.0");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen || !request) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const rate = parseFloat(commissionRate);
            if (isNaN(rate) || rate <= 0) {
                toast.error("Please enter a valid commission rate");
                return;
            }

            await api.agents.proposeTerms(request.id, {
                commission_rate: rate
            });

            toast.success("Proposal sent successfully!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to send proposal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Propose Terms</h2>
                        <p className="text-xs text-gray-500">Send your offer to {request.client?.first_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Client Request Summary */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Request</span>
                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-blue-700 shadow-sm border border-blue-100">
                                {request.service_type}
                            </span>
                        </div>
                        <p className="text-sm text-blue-900 italic">
                            "{request.initial_message || 'No specific message.'}"
                        </p>
                        {request.property_preferences && (
                            <div className="mt-3 pt-3 border-t border-blue-200/50">
                                {request.service_type === 'BUYING' ? (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-blue-500 block">Budget</span>
                                            <span className="font-bold text-blue-900">{request.property_preferences.budget || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-blue-500 block">Location</span>
                                            <span className="font-bold text-blue-900">{request.property_preferences.locations || 'N/A'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs">
                                        <span className="text-blue-500 block">Property</span>
                                        <span className="font-bold text-blue-900">{request.property_preferences.property_details || 'N/A'}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Proposal Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">
                                Your Commission Rate (%)
                            </label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all font-mono font-bold text-gray-900"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                                Standard market rate is usually 1.5% - 2.0%
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">
                                Message (Optional)
                            </label>
                            <textarea
                                className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400 resize-none text-sm"
                                placeholder="Add a personal note about why you're the best fit..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 h-11 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg shadow-gray-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : (
                            <>
                                Send Proposal <Send size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
