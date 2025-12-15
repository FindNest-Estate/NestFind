"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Loader2, Clock, MapPin,
    MessageSquare, ArrowRight, Wallet, Calendar, Star,
    Heart, Home, TrendingUp, ShieldCheck,
    Sparkles, Building2, LayoutDashboard, History
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { toast } from 'sonner';

// --- Utility Components ---
const StatCard = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900 leading-none tracking-tight">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
            <Icon size={18} strokeWidth={2} />
        </div>
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: any) => (
    <div className="flex items-center justify-between mb-4 mt-2 px-1">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            {Icon && <Icon size={16} className="text-gray-400" />} {title}
        </h3>
        {action && action}
    </div>
);

export default function BuyerDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [visits, setVisits] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [cancelModal, setCancelModal] = useState<{ show: boolean, visitId: number | null }>({ show: false, visitId: null });
    const [feedbackModal, setFeedbackModal] = useState({ show: false, visitId: 0, rating: 0, comment: "" });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [favData, histData, visitsData, offersData] = await Promise.all([
                    api.users.getFavorites(),
                    api.users.getRecentlyViewed(),
                    api.bookings.list(),
                    api.offers.list()
                ]);
                setFavorites(favData);
                setHistory(histData.filter((h: any) => h.property));

                // Deduplicate Visits
                const seenVisitProps = new Set();
                const uniqueVisits = visitsData
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .filter((visit: any) => {
                        if (visit.property && !seenVisitProps.has(visit.property.id)) {
                            seenVisitProps.add(visit.property.id);
                            return true;
                        }
                        return false;
                    });
                setVisits(uniqueVisits);

                // Deduplicate Offers
                const seenOfferProps = new Set();
                const uniqueOffers = offersData
                    .sort((a: any, b: any) => b.id - a.id)
                    .filter((offer: any) => {
                        if (offer.property && !seenOfferProps.has(offer.property.id)) {
                            seenOfferProps.add(offer.property.id);
                            return true;
                        }
                        return false;
                    });
                setOffers(uniqueOffers);

                // Recommendations
                if (histData.length < 5) {
                    const allProps = await api.properties.list();
                    const recs = allProps.filter((p: any) =>
                        !favData.some((f: any) => f.id === p.id) &&
                        !visitsData.some((v: any) => v.property?.id === p.id)
                    ).slice(0, 3);
                    setRecommendations(recs);
                } else {
                    setRecommendations(histData.slice(0, 3));
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCancelVisit = async () => {
        if (!cancelModal.visitId) return;
        try {
            await api.bookings.updateStatus(cancelModal.visitId, { action: 'CANCEL', reason: "Buyer cancelled" });
            setVisits(visits.map(v => v.id === cancelModal.visitId ? { ...v, status: 'CANCELLED' } : v));
            setCancelModal({ show: false, visitId: null });
            toast.success("Visit cancelled successfully");
        } catch (error) {
            console.error("Failed to cancel visit", error);
            toast.error("Failed to cancel visit");
        }
    };

    const handleSubmitFeedback = async () => {
        try {
            await api.bookings.createReview(feedbackModal.visitId, {
                rating: feedbackModal.rating,
                comment: feedbackModal.comment,
                visit_outcome: 'Completed'
            });
            setVisits(prev => prev.map(v => v.id === feedbackModal.visitId ? { ...v, buyer_rating: feedbackModal.rating } : v));
            setFeedbackModal({ show: false, visitId: 0, rating: 0, comment: "" });
            toast.success("Feedback submitted!");
        } catch (error) {
            toast.error("Failed to submit feedback");
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'TBD';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#F3F4F6]">
                <Loader2 className="animate-spin text-gray-900" size={32} />
            </div>
        );
    }

    const activeOffer = offers.find(o => !['rejected', 'cancelled', 'completed'].includes(o.status));
    const completedDeals = offers.filter(o => o.status === 'completed');
    const upcomingVisits = visits.filter(v => ['CONFIRMED', 'PENDING'].includes(v.status));

    const getTimeOfDayGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-900 pb-20">
            <div className="max-w-[1400px] mx-auto px-6 py-6">

                {/* --- 1. Compact Control Center Header --- */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                {getTimeOfDayGreeting()}, <span className="text-gray-500">{user?.first_name || 'User'}</span>
                            </h1>
                            <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> System Operational
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm">
                                Find Agent
                            </button>
                            <Link href="/properties" className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition shadow-sm">
                                Browse Properties
                            </Link>
                        </div>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Active Deals" value={offers.filter(o => !['rejected', 'completed', 'cancelled'].includes(o.status)).length} icon={Wallet} colorClass="bg-blue-50 text-blue-600" />
                        <StatCard label="Scheduled Visits" value={upcomingVisits.length} icon={Calendar} colorClass="bg-purple-50 text-purple-600" />
                        <StatCard label="Properties Owned" value={completedDeals.length} icon={Home} colorClass="bg-emerald-50 text-emerald-600" />
                        <StatCard label="Favorites" value={favorites.length} icon={Heart} colorClass="bg-rose-50 text-rose-600" />
                    </div>
                </header>


                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* === LEFT COLUMN (8/12): Main Operations === */}
                    <div className="xl:col-span-8 space-y-8">

                        {/* A. Active Deal Command Center */}
                        <section>
                            <SectionHeader title="Active Transaction" icon={LayoutDashboard} />
                            {activeOffer ? (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-colors">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-4">
                                                <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {activeOffer.property?.images?.[0] ?
                                                        <img src={`${api.API_URL}/${activeOffer.property.images[0].image_path}`} className="h-full w-full object-cover" /> :
                                                        <Home size={24} className="m-auto text-gray-300" />
                                                    }
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">In Progress</span>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-gray-900">{activeOffer.property?.title}</h3>
                                                    <p className="text-gray-500 text-xs">{activeOffer.property?.address}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Offer Value</p>
                                                <p className="text-lg font-bold text-gray-900">₹{activeOffer.amount.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Status Bar */}
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center justify-between text-xs">
                                            <span className="font-medium text-gray-500">Current Status:</span>
                                            <span className="font-bold text-gray-900 uppercase">{activeOffer.status.replace('_', ' ')}</span>
                                        </div>

                                        <div className="flex gap-3">
                                            <Link href={`/dashboard/deals/${activeOffer.id}`} className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-bold text-center hover:bg-gray-800 transition flex items-center justify-center gap-2">
                                                Enter Deal Room <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                    {/* Progress Strip */}
                                    <div className="h-1 w-full bg-gray-100">
                                        <div className="h-full bg-blue-500 w-[60%]"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wallet size={20} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">No Active Deals</h3>
                                    <p className="text-xs text-gray-500 mb-4">You are not currently involved in any active negotiations.</p>
                                    <Link href="/properties" className="text-xs font-bold text-blue-600 hover:underline">Start a new search</Link>
                                </div>
                            )}
                        </section>

                        {/* B. Purchased Portfolio (The "Bought Properties" Section) */}

                        {/* B. Purchased Portfolio - Asset Cards */}
                        {completedDeals.length > 0 && (
                            <section>
                                <SectionHeader title="Property Portfolio" icon={Building2} />
                                <div className="space-y-4">
                                    {completedDeals.map(deal => (
                                        <div key={deal.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center group">
                                            {/* Image */}
                                            <div className="h-24 w-24 md:h-20 md:w-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 relative">
                                                {deal.property?.images?.[0] ?
                                                    <img src={`${api.API_URL}/${deal.property.images[0].image_path}`} className="h-full w-full object-cover" /> :
                                                    <div className="h-full w-full flex items-center justify-center text-gray-300"><Home size={24} /></div>
                                                }
                                                <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                    Owned
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 text-base mb-1 truncate">{deal.property.title}</h4>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} /> {deal.property.city}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} /> Acquired: {formatDate(deal.updated_at || deal.created_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                                        Fully Paid
                                                    </span>
                                                    <Link href={`/dashboard/deals/${deal.id}`} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                        View Documents <ArrowRight size={10} />
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Value & Action */}
                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 md:gap-1 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-gray-100">
                                                <div className="text-left md:text-right">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asset Value</p>
                                                    <p className="text-xl font-bold text-gray-900">₹{deal.amount.toLocaleString()}</p>
                                                </div>
                                                <Link href={`/dashboard/deals/${deal.id}`} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition shadow-sm flex items-center gap-2">
                                                    Manage Asset
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* C. Recommendations Grid */}
                        <section>
                            <SectionHeader title="Recommended for You" icon={Sparkles} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {recommendations.map((rec) => (
                                    <Link href={`/properties/${rec.id}`} key={rec.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                        <div className="aspect-video bg-gray-100 relative">
                                            {rec.images?.[0] && <img src={`${api.API_URL}/${rec.images[0].image_path}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                            <div className="absolute bottom-2 left-2 text-white">
                                                <p className="font-bold text-sm">₹{rec.price.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-gray-900 text-xs truncate">{rec.title}</h4>
                                            <p className="text-[10px] text-gray-500 truncate">{rec.address}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* === RIGHT COLUMN (4/12): Schedule & Tools === */}
                    <div className="xl:col-span-4 space-y-6">

                        {/* 1. Upcoming Schedule (High Density) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> Schedule
                                </h3>
                                <Link href="/dashboard/my-visits" className="text-[10px] font-bold text-blue-600 hover:underline">View Calendar</Link>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {upcomingVisits.length > 0 ? upcomingVisits.slice(0, 5).map(visit => (
                                    <div key={visit.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 group">
                                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-gray-500 border border-gray-200 flex-shrink-0">
                                            <span className="text-[10px] font-bold uppercase">{visit.date ? new Date(visit.date).toLocaleString('default', { month: 'short' }) : '---'}</span>
                                            <span className="text-lg font-bold leading-none">{visit.date ? new Date(visit.date).getDate() : '--'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{visit.property?.title}</p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} /> {visit.time_slot}
                                            </p>
                                            <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setCancelModal({ show: true, visitId: visit.id })}
                                                    className="text-[10px] text-red-500 hover:text-red-700 font-bold"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            {visit.visit_otp && (
                                                <div className="mt-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex justify-between items-center border border-rose-100">
                                                    <span>Start Code:</span>
                                                    <span className="font-mono text-sm tracking-widest">{visit.visit_otp}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center">
                                        <p className="text-xs text-gray-400">No upcoming visits.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Quick Actions */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition bg-gray-50/50">
                                    <MessageSquare size={18} className="text-gray-700 mb-2" />
                                    <span className="text-[10px] font-bold text-gray-600">Messages</span>
                                </button>
                                <button className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition bg-gray-50/50">
                                    <ShieldCheck size={18} className="text-gray-700 mb-2" />
                                    <span className="text-[10px] font-bold text-gray-600">Verify ID</span>
                                </button>
                            </div>
                        </div>

                        {/* 3. Visit History (Compact) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    <History size={14} /> Recent History
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {visits.filter(v => v.status === 'COMPLETED').slice(0, 3).map(visit => (
                                    <div key={visit.id} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs text-gray-600 truncate max-w-[150px]">{visit.property?.title}</span>
                                        </div>
                                        {visit.buyer_rating ? (
                                            <div className="flex items-center gap-0.5 text-amber-400">
                                                <Star size={10} fill="currentColor" />
                                                <span className="text-[10px] font-bold text-gray-600">{visit.buyer_rating}</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setFeedbackModal({ show: true, visitId: visit.id, rating: 0, comment: "" })}
                                                className="text-[10px] font-bold text-blue-600 hover:underline"
                                            >
                                                Rate
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {visits.filter(v => v.status === 'COMPLETED').length === 0 && (
                                    <div className="p-4 text-center text-xs text-gray-400">No past visits</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationDialog
                isOpen={cancelModal.show}
                onClose={() => setCancelModal({ show: false, visitId: null })}
                onConfirm={handleCancelVisit}
                title="Cancel Visit"
                message="Are you sure you want to cancel this tour?"
                variant="danger"
            />

            {feedbackModal.show && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Rate Your Visit</h3>
                            <p className="text-gray-500 text-xs mt-1">How was your tour experience?</p>
                        </div>
                        <div className="flex justify-center mb-6 gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setFeedbackModal(prev => ({ ...prev, rating: star }))} className={`transition-all hover:scale-110 ${feedbackModal.rating >= star ? 'text-amber-400' : 'text-gray-200'}`}>
                                    <Star size={28} fill="currentColor" />
                                </button>
                            ))}
                        </div>
                        <textarea className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 mb-6 resize-none" rows={3} placeholder="Share your thoughts..." value={feedbackModal.comment} onChange={(e) => setFeedbackModal(prev => ({ ...prev, comment: e.target.value }))} />
                        <div className="flex gap-3">
                            <button onClick={() => setFeedbackModal({ show: false, visitId: 0, rating: 0, comment: "" })} className="flex-1 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-100 rounded-lg transition">Cancel</button>
                            <button onClick={handleSubmitFeedback} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition" disabled={feedbackModal.rating === 0}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
