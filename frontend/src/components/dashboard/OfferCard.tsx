"use client";

import { MapPin, Check, X, MessageSquare, User, ArrowRight, Clock, Shield } from "lucide-react";
import { api } from "@/lib/api";

interface OfferCardProps {
    offer: any;
    onAction: (action: string, offerId: number, payload?: any) => void;
    onViewDeal: (offerId: number) => void;
}

export default function OfferCard({ offer, onAction, onViewDeal }: OfferCardProps) {
    const isPending = offer.status === 'pending';
    const isAccepted = offer.status === 'accepted';
    const isTokenPaid = offer.status === 'token_paid';
    const isCompleted = offer.status === 'completed';
    const isCountered = offer.status === 'countered';
    const isRejected = offer.status === 'rejected';

    const statusConfig = {
        pending: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: Clock, label: "Action Required" },
        accepted: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: Check, label: "Offer Accepted" },
        rejected: { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", icon: X, label: "Rejected" },
        countered: { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", icon: MessageSquare, label: "Counter Sent" },
        token_paid: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", icon: Shield, label: "Token Paid" },
        completed: { color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100", icon: Check, label: "Deal Closed" },
    };

    const status = statusConfig[offer.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
        <div
            onClick={() => onViewDeal(offer.id)}
            className="group relative bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
        >
            {/* 1. Header: Buyer Profile & Status */}
            <div className="p-5 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                            {offer.buyer?.profile_image ? (
                                <img src={offer.buyer.profile_image} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} className="text-gray-400" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight">
                            {offer.buyer?.first_name} {offer.buyer?.last_name}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Buyer</p>
                    </div>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${status.bg} ${status.color} ${status.border}`}>
                    <StatusIcon size={12} strokeWidth={2.5} />
                    {status.label}
                </div>
            </div>

            {/* 2. Hero: Property Image */}
            <div className="px-5 pb-5">
                <div className="relative w-full aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden shadow-inner group-hover:shadow-md transition-shadow">
                    {offer.property?.images?.[0] ? (
                        <img src={`${api.API_URL}/${offer.property.images[0].image_path}`} alt="Prop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={32} /></div>
                    )}
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-bold text-base shadow-sm truncate">{offer.property?.title}</h3>
                        <p className="text-xs text-white/90 truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {offer.property?.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Price Block */}
            <div className="px-5 pb-5 mt-auto">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Offer Amount</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 tracking-tight">₹{offer.amount.toLocaleString()}</span>
                </div>
            </div>

            {/* 4. Footer Actions (Full Width) */}
            <div className="mt-auto border-t border-gray-100 p-3 bg-gray-50/50">
                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                    {isPending ? (
                        <>
                            <button
                                onClick={() => onAction('REJECT', offer.id)}
                                className="col-span-1 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Decline
                            </button>
                            <button
                                onClick={() => onAction('ACCEPT', offer.id)}
                                className="col-span-1 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black shadow-lg shadow-gray-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Accept
                            </button>
                            <button
                                onClick={() => onAction('COUNTER_MODAL', offer.id)}
                                className="col-span-2 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={14} /> Counter Offer
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onViewDeal(offer.id)}
                            className="col-span-2 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            View Deal Room
                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
