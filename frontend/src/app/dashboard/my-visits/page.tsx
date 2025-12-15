"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, Calendar, Clock, Navigation, MessageSquare, X, CheckCircle2, XCircle, Image as ImageIcon, Shield } from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import Link from "next/link";
import ChatWindow from "@/components/chat/ChatWindow";

export default function MyVisitsPage() {
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatModal, setChatModal] = useState({ show: false, partnerId: 0, partnerName: "", propertyId: 0 });
    const [ratingModal, setRatingModal] = useState<{ show: boolean, visit: any | null }>({ show: false, visit: null });
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const [offerModal, setOfferModal] = useState<{ show: boolean; visit: any | null }>({ show: false, visit: null });
    const [offerAmount, setOfferAmount] = useState("");

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                const data = await api.bookings.myVisits();
                // Ensure uniqueness by ID just in case, but allow multiple visits to same property
                const uniqueVisits = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
                // Sort by id desc (newest first)
                uniqueVisits.sort((a: any, b: any) => b.id - a.id);
                setVisits(uniqueVisits);
            } catch (error) {
                console.error("Failed to fetch visits", error);
                toast.error("Failed to load visits");
            } finally {
                setLoading(false);
            }
        };
        fetchVisits();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <Loader2 className="animate-spin text-rose-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8 pt-28">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Itinerary</h1>
                    <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                        {visits.length} Upcoming
                    </span>
                </div>

                {visits.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming visits</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">You haven't scheduled any property visits yet. Start exploring to find your dream home.</p>
                        <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
                            Browse Properties
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {visits.map((visit) => (
                            <div key={visit.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col sm:flex-row group">
                                {/* Thumbnail */}
                                <div className="sm:w-64 h-56 sm:h-auto bg-gray-100 relative shrink-0 overflow-hidden">
                                    {visit.property?.images?.[0] ? (
                                        <img
                                            src={`${api.API_URL}/${visit.property.images[0].image_path}`}
                                            alt={visit.property.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                            <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                                                <ImageIcon size={24} className="text-gray-300" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-400">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <StatusBadge status={visit.status} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
                                                {visit.property?.title}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-6">
                                            <MapPin size={14} className="shrink-0" />
                                            <span className="line-clamp-1">{visit.property?.address}, {visit.property?.city}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-gray-50 p-3 rounded-xl">
                                                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Date</div>
                                                <div className="flex items-center gap-2 font-semibold text-gray-900">
                                                    <Calendar size={18} className="text-rose-500" />
                                                    {new Date(visit.visit_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl">
                                                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Time</div>
                                                <div className="flex items-center gap-2 font-semibold text-gray-900">
                                                    <Clock size={18} className="text-rose-500" />
                                                    {visit.visit_time}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Counter Proposal Alert */}
                                    {visit.status === 'COUNTER_PROPOSED' && (
                                        <div className="mb-6 p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-orange-100 p-2 rounded-lg shrink-0">
                                                    <Clock size={20} className="text-orange-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 mb-1">New Time Proposed</h4>
                                                    <p className="text-sm text-gray-600 mb-3">
                                                        The agent has suggested a new time for your visit: <span className="font-semibold text-orange-700">
                                                            {visit.agent_suggested_slot
                                                                ? new Date(visit.agent_suggested_slot).toLocaleString(undefined, {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: 'numeric',
                                                                    minute: '2-digit'
                                                                })
                                                                : "No time specified"}
                                                        </span>
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.bookings.updateStatus(visit.id, {
                                                                        action: 'APPROVE',
                                                                        slot: visit.agent_suggested_slot
                                                                    });
                                                                    toast.success("New time accepted!");
                                                                    const data = await api.bookings.myVisits();
                                                                    setVisits(data);
                                                                } catch (e) {
                                                                    toast.error("Failed to accept time");
                                                                }
                                                            }}
                                                            className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-gray-900/20"
                                                        >
                                                            Accept New Time
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.bookings.updateStatus(visit.id, {
                                                                        action: 'REJECT',
                                                                        reason: "Time not suitable"
                                                                    });
                                                                    toast.success("Proposal rejected");
                                                                    const data = await api.bookings.myVisits();
                                                                    setVisits(data);
                                                                } catch (e) {
                                                                    toast.error("Failed to reject");
                                                                }
                                                            }}
                                                            className="flex-1 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* OTP Display */}
                                    {visit.visit_otp && (
                                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Start Code</p>
                                                <p className="text-xs text-rose-800">Share with agent to start visit</p>
                                            </div>
                                            <div className="text-3xl font-mono font-bold text-rose-600 tracking-widest">{visit.visit_otp}</div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {(visit.status === 'confirmed' || visit.status === 'APPROVED') && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <a
                                                href={`tel:${visit.property?.seller_phone || '9876543210'}`}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                                            >
                                                <Phone size={16} /> Call
                                            </a>
                                            <button
                                                onClick={() => setChatModal({ show: true, partnerId: visit.property?.user_id, partnerName: visit.property?.seller_name || "Agent", propertyId: visit.property_id })}
                                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                                            >
                                                <MessageSquare size={16} /> Chat
                                            </button>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.property?.address + ' ' + visit.property?.city)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                                            >
                                                <Navigation size={16} /> Map
                                            </a>
                                        </div>
                                    )}

                                    {visit.status === 'COMPLETED' && (
                                        <div className="flex gap-3">
                                            {!visit.buyer_rating && (
                                                <button
                                                    onClick={() => {
                                                        setRating(0);
                                                        setComment("");
                                                        setRatingModal({ show: true, visit });
                                                    }}
                                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                                                >
                                                    <MessageSquare size={18} /> Rate Experience
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setOfferAmount("");
                                                    setOfferModal({ show: true, visit });
                                                }}
                                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                            >
                                                <Shield size={18} /> Make Offer
                                            </button>
                                        </div>
                                    )}

                                    {visit.status === 'pending' && (
                                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                                            <Clock size={16} className="shrink-0" />
                                            <span>Waiting for agent confirmation</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Chat Modal */}
                {chatModal.show && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md relative shadow-2xl overflow-hidden">
                            <button
                                onClick={() => setChatModal({ show: false, partnerId: 0, partnerName: "", propertyId: 0 })}
                                className="absolute top-4 right-4 bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition-colors z-10"
                            >
                                <X size={18} />
                            </button>
                            <ChatWindow
                                partnerId={chatModal.partnerId}
                                partnerName={chatModal.partnerName}
                                propertyId={chatModal.propertyId}
                                onBack={() => setChatModal({ show: false, partnerId: 0, partnerName: "", propertyId: 0 })}
                            />
                        </div>
                    </div>
                )}

                {/* Rating Modal */}
                {ratingModal.show && ratingModal.visit && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Rate Agent</h3>
                            <p className="text-gray-500 text-center mb-8">How was your visit experience?</p>

                            <div className="flex justify-center gap-3 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-gray-200'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your thoughts (optional)..."
                                className="w-full bg-gray-50 border-0 rounded-xl p-4 mb-6 h-32 resize-none focus:ring-2 focus:ring-rose-500/20 text-gray-900 placeholder:text-gray-400"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRatingModal({ show: false, visit: null })}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await api.bookings.createReview(ratingModal.visit.id, { rating, comment });

                                            // Optimistic update
                                            setVisits(prev => prev.map(v =>
                                                v.id === ratingModal.visit.id
                                                    ? { ...v, buyer_rating: rating, buyer_feedback: comment }
                                                    : v
                                            ));

                                            setRatingModal({ show: false, visit: null });
                                            toast.success("Rating submitted!");

                                            // Background refresh
                                            const data = await api.bookings.myVisits();
                                            const uniqueVisits = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
                                            uniqueVisits.sort((a: any, b: any) => b.id - a.id);
                                            setVisits(uniqueVisits);
                                        } catch (e: any) {
                                            console.error("Review error:", e);
                                            toast.error(e.message || "Failed to submit rating");
                                        }
                                    }}
                                    disabled={rating === 0}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:shadow-none"
                                >
                                    Submit Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Offer Modal */}
                {offerModal.show && offerModal.visit && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Make an Offer</h3>
                            <p className="text-gray-500 text-center mb-6">Enter your offer amount for {offerModal.visit.property?.title}</p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Amount (₹)</label>
                                <input
                                    type="number"
                                    value={offerAmount}
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-xl p-4 focus:ring-2 focus:ring-rose-500/20 text-gray-900 placeholder:text-gray-400 font-semibold text-lg"
                                    placeholder="e.g. 8500000"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setOfferModal({ show: false, visit: null }); setOfferAmount(""); }}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await api.offers.create({
                                                property_id: offerModal.visit.property.id,
                                                amount: parseFloat(offerAmount)
                                            });
                                            setOfferModal({ show: false, visit: null });
                                            setOfferAmount("");
                                            toast.success("Offer submitted successfully!");
                                        } catch (e: any) {
                                            console.error("Offer error:", e);
                                            toast.error(e.message || "Failed to submit offer");
                                        }
                                    }}
                                    disabled={!offerAmount}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:shadow-none"
                                >
                                    Submit Offer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
        APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
        rejected: "bg-rose-100 text-rose-700 border-rose-200",
        REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
        completed: "bg-blue-100 text-blue-700 border-blue-200",
        COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
        cancelled: "bg-gray-100 text-gray-700 border-gray-200",
        CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
        COUNTER_PROPOSED: "bg-orange-100 text-orange-700 border-orange-200",
    };

    const labels = {
        pending: "Pending",
        confirmed: "Confirmed",
        APPROVED: "Confirmed",
        rejected: "Declined",
        REJECTED: "Declined",
        completed: "Completed",
        COMPLETED: "Completed",
        cancelled: "Cancelled",
        CANCELLED: "Cancelled",
        COUNTER_PROPOSED: "Counter Offer",
    };

    const icons = {
        pending: Clock,
        confirmed: CheckCircle2,
        APPROVED: CheckCircle2,
        rejected: XCircle,
        REJECTED: XCircle,
        completed: CheckCircle2,
        COMPLETED: CheckCircle2,
        cancelled: XCircle,
        CANCELLED: XCircle,
        COUNTER_PROPOSED: Clock,
    };

    const style = styles[status as keyof typeof styles] || styles.cancelled;
    const label = labels[status as keyof typeof labels] || status;
    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md shadow-sm ${style}`}>
            <Icon size={12} strokeWidth={2.5} />
            {label}
        </span>
    );
}
