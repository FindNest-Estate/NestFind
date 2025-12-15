"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, TrendingUp, DollarSign, Briefcase, AlertCircle, ArrowUpRight, Filter, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AgentLayout from "@/components/dashboard/AgentLayout";
import OfferCard from "@/components/dashboard/OfferCard";
import { toast } from "sonner";

export default function AgentDealsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [counterModal, setCounterModal] = useState<{ show: boolean, offerId: number | null }>({ show: false, offerId: null });
    const [counterAmount, setCounterAmount] = useState("");

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const data = await api.offers.list();

                // Deduplicate logic (group by property + buyer)
                const uniqueOffersMap = new Map();
                data.sort((a: any, b: any) => b.id - a.id);
                data.forEach((offer: any) => {
                    // Filter out own offers if any (redundant but safe)
                    // Removed client-side filter to ensure all backend-returned offers are shown


                    const key = `${offer.property_id}-${offer.buyer_id}`;
                    if (!uniqueOffersMap.has(key)) {
                        uniqueOffersMap.set(key, offer);
                    }
                });
                setOffers(Array.from(uniqueOffersMap.values()));
            } catch (error) {
                console.error("Failed to fetch offers", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, [user]);

    const handleStatusUpdate = async (id: number, status: string, amount?: number) => {
        try {
            await api.offers.update(id, { status, amount });
            setOffers(offers.map(o => o.id === id ? { ...o, status, ...(amount && { amount }) } : o));
            if (status === 'countered') {
                setCounterModal({ show: false, offerId: null });
                setCounterAmount("");
                toast.success("Counter offer sent!");
            } else if (status === 'accepted') {
                toast.success("Offer accepted! Deal Room created.");
            }
        } catch (error) {
            console.error("Failed to update offer", error);
            toast.error("Failed to update status");
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    if (loading) {
        return (
            <AgentLayout title="Sales Pipeline">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-gray-900" size={32} />
                </div>
            </AgentLayout>
        );
    }

    const activeOffers = offers.filter(o => ['pending', 'countered', 'negotiating', 'accepted', 'token_paid', 'registration', 'commission'].includes(o.status));
    const closedOffers = offers.filter(o => ['completed', 'rejected', 'cancelled'].includes(o.status));

    // Derived Metrics
    const pipelineValue = activeOffers.reduce((sum, o) => sum + o.amount, 0);
    const closedValue = closedOffers.reduce((sum, o) => sum + o.amount, 0);

    return (
        <AgentLayout title="Sales Pipeline">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* 1. Header & Metrics */}
                <div>
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{getGreeting()}, {user?.first_name}</p>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sales Pipeline</h1>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                                <Filter size={16} /> Filter
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                                <Search size={16} /> Search
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pipeline Value */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-500">Pipeline Value</span>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Briefcase size={18} />
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-bold text-gray-900">₹{(pipelineValue / 100000).toFixed(1)}L</h3>
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                    <TrendingUp size={12} /> +12%
                                </span>
                            </div>
                        </div>

                        {/* Closed Revenue */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-500">Closed (This Month)</span>
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <DollarSign size={18} />
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-bold text-gray-900">₹{(closedValue / 100000).toFixed(1)}L</h3>
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                    <ArrowUpRight size={12} /> 4 Deals
                                </span>
                            </div>
                        </div>

                        {/* Market Insight (Widget) */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-sm text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold text-xs uppercase tracking-wider">
                                    <AlertCircle size={14} /> Market Insight
                                </div>
                                <p className="text-sm font-medium leading-relaxed opacity-90">
                                    "Offers in your area are trending <span className="text-white font-bold">5% below ask</span> this week."
                                </p>
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={100} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* 2. Main content: ACTIVE NEGOTIATIONS (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                Active Pipeline
                                <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{activeOffers.length}</span>
                            </h2>
                        </div>

                        {activeOffers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                    <Briefcase size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 font-medium mb-1">No active negotiations</h3>
                                <p className="text-gray-500 text-sm">Wait for incoming offers or boost your listings.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {activeOffers.map((offer) => (
                                    <OfferCard
                                        key={offer.id}
                                        offer={offer}
                                        onAction={(action, offerId, payload) => {
                                            if (action === 'COUNTER_MODAL') setCounterModal({ show: true, offerId });
                                            else if (action === 'ACCEPT') handleStatusUpdate(offerId, 'accepted');
                                            else if (action === 'REJECT') handleStatusUpdate(offerId, 'rejected');
                                        }}
                                        onViewDeal={(offerId) => router.push(`/dashboard/deals/${offerId}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Sidebar: CLOSED & HISTORY (4 cols) */}
                    <div className="lg:col-span-4 space-y-6 sticky top-24 self-start">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Past Deals</h2>
                            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                                {closedOffers.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-gray-500">No closed deals yet.</div>
                                ) : (
                                    closedOffers.map(offer => (
                                        <div key={offer.id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center group cursor-pointer" onClick={() => router.push(`/dashboard/deals/${offer.id}`)}>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 truncate pr-2">{offer.property?.title}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">Sold for ₹{(offer.amount / 100000).toFixed(2)}L</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded-full">
                                                    {offer.status}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{new Date(offer.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Tip Card */}
                        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                            <h4 className="font-bold text-blue-900 text-sm mb-2">Pro Tip</h4>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Deals close 40% faster when you respond to offers within 2 hours. Keep your notifications on!
                            </p>
                        </div>
                    </div>

                </div>

                {/* Counter Offer Modal */}
                {counterModal.show && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100">
                            <h3 className="text-lg font-bold mb-1">Counter Offer</h3>
                            <p className="text-sm text-gray-500 mb-6">Propose a new price to the buyer.</p>

                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">New Price</label>
                            <div className="relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={counterAmount}
                                    onChange={(e) => setCounterAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCounterModal({ show: false, offerId: null })}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(counterModal.offerId!, 'countered', parseFloat(counterAmount))}
                                    className="flex-1 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                    Send Counter
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AgentLayout>
    );
}
