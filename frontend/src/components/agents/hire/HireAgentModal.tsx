"use client";

import { useState } from "react";
import { X, Check, Building2, Home, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface HireAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: {
        id: number;
        first_name: string;
        last_name: string;
        avatar_url?: string;
    } | null;
}

export default function HireAgentModal({ isOpen, onClose, agent }: HireAgentModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [serviceType, setServiceType] = useState<"BUYING" | "SELLING" | null>(null);
    const [loading, setLoading] = useState(false);

    // Form States
    const [locations, setLocations] = useState("");
    const [budget, setBudget] = useState("");
    const [propertyDetails, setPropertyDetails] = useState("");
    const [message, setMessage] = useState("");

    if (!isOpen || !agent) return null;

    const handleNext = () => {
        if (step === 1 && serviceType) {
            setStep(2);
            // Set default message based on type
            if (!message) {
                setMessage(serviceType === "BUYING"
                    ? `Hi ${agent.first_name}, I'm looking to buy a property in...`
                    : `Hi ${agent.first_name}, I'm looking to sell my property at...`
                );
            }
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            const preferences = serviceType === "BUYING"
                ? { locations, budget }
                : { property_details: propertyDetails };

            await api.agents.hire(agent.id, {
                service_type: serviceType!,
                property_preferences: preferences,
                initial_message: message
            });

            setStep(3);
            toast.success("Request sent successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to send request");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setServiceType(null);
        setLocations("");
        setBudget("");
        setPropertyDetails("");
        setMessage("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Hire {agent.first_name}</h2>
                        <p className="text-xs text-gray-500">starts a formal service request</p>
                    </div>
                    <button onClick={reset} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700">What are you looking for?</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setServiceType("BUYING")}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${serviceType === "BUYING"
                                            ? "border-rose-500 bg-rose-50"
                                            : "border-gray-100 hover:border-rose-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <Home className={`mb-3 ${serviceType === "BUYING" ? "text-rose-500" : "text-gray-400"}`} size={24} />
                                    <div className="font-bold text-gray-900">Buy a Home</div>
                                    <div className="text-xs text-gray-500 mt-1">Found my dream place</div>
                                </button>

                                <button
                                    onClick={() => setServiceType("SELLING")}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${serviceType === "SELLING"
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <Building2 className={`mb-3 ${serviceType === "SELLING" ? "text-blue-500" : "text-gray-400"}`} size={24} />
                                    <div className="font-bold text-gray-900">Sell Property</div>
                                    <div className="text-xs text-gray-500 mt-1">Get the best price</div>
                                </button>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!serviceType}
                                className="w-full mt-4 flex items-center justify-center gap-2 h-12 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors"
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            {serviceType === "BUYING" ? (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Preferred Locations</label>
                                        <input
                                            type="text"
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="e.g. Downtown, West End"
                                            value={locations}
                                            onChange={(e) => setLocations(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Budget Range</label>
                                        <input
                                            type="text"
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="e.g. $500k - $800k"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Property Details</label>
                                    <textarea
                                        className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none"
                                        placeholder="Address, Type, Expected Price..."
                                        value={propertyDetails}
                                        onChange={(e) => setPropertyDetails(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Message</label>
                                <textarea
                                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 outline-none transition-all placeholder:text-gray-400 resize-none"
                                    placeholder="Tell the agent more..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full mt-2 flex items-center justify-center gap-2 h-12 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Hire Request"}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-8 animate-in zoom-in-90 duration-300">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
                            <p className="text-gray-500 max-w-xs mx-auto mb-8">
                                {agent.first_name} will review your request and send a proposal with their terms shortly.
                            </p>
                            <button
                                onClick={reset}
                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
