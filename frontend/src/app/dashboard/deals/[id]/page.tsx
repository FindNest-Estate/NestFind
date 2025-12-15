"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldCheck, ArrowLeft, TrendingUp, Clock, Target, Calendar, Home, Phone, Mail, Building2, CheckCircle2 } from "lucide-react";
import { DealTimeline } from "@/components/deals/DealTimeline";
import { DocumentVault } from "@/components/deals/DocumentVault";
import { FinancialBreakdown } from "@/components/deals/FinancialBreakdown";
import { NegotiationRoom } from "@/components/deals/NegotiationRoom";
import { toast } from "sonner";
import Link from "next/link";

export default function DealRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchDeal = async () => {
        try {
            const data = await api.offers.get(Number(params.id));
            setDeal(data);
        } catch (error) {
            console.error("Failed to fetch deal", error);
            toast.error("Failed to load deal details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) fetchDeal();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-[#FAFBFC]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-gray-900" size={32} />
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    if (!deal) return null;

    const isBuyer = user?.id === deal.buyer_id;
    const isAgent = user?.id === deal.property.user_id;

    const isNegotiating = ['pending', 'countered', 'rejected'].includes(deal.status);
    const isCompleted = deal.status === 'completed';

    // Calculate Progress dynamically
    const steps = ['accepted', 'token_paid', 'registration', 'commission', 'completed'];
    const currentStepIndex = steps.indexOf(deal.status === 'completed' ? 'completed' :
        deal.sale_deed_url ? 'commission' :
            deal.status === 'token_paid' ? 'registration' :
                'token_paid');

    let progress = 0;
    if (!isNegotiating) {
        progress = Math.min(((currentStepIndex + 1) / steps.length) * 100, 100);
    }

    return (
        <div className="min-h-screen bg-[#FAFBFC] font-sans text-gray-900 pb-24">
            {/* 1. Sticky Header - Premium Workspace Bar */}
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 transition-all duration-300">
                <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-xl">
                            <ArrowLeft size={18} strokeWidth={2} />
                        </Link>
                        <div className="h-6 w-px bg-gray-200" />
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Deal Room</p>
                            <h1 className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[200px] sm:max-w-md">{deal.property.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-500">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                                <Building2 size={12} /> {deal.property.city}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                                ID: #{deal.id}
                            </span>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isNegotiating ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isNegotiating ? 'bg-amber-500 animate-pulse' : isCompleted ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                            {isNegotiating ? 'Negotiation' : isCompleted ? 'Closed' : 'Active'}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto px-6 py-8">

                {/* 2. Top Stats Row - Only show if not negotiating */}
                {!isNegotiating && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Deal Value</p>
                            <p className="text-lg font-bold text-gray-900">₹{deal.amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Current Stage</p>
                            <p className="text-lg font-bold text-gray-900">{steps[currentStepIndex]?.replace('_', ' ').toUpperCase() || 'Start'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completion Progress</p>
                                <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-900 rounded-full transition-all duration-1000" style={{ width: `${Math.max(progress, 5)}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* === LEFT COLUMN (8/12): Main Workflow === */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Negotiation Mode */}
                        {isNegotiating ? (
                            <div className="bg-white rounded-2xl p-1 border border-gray-100 shadow-xl shadow-gray-200/50">
                                <div className="bg-amber-50/50 rounded-xl p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Offer Negotiation</h2>
                                            <p className="text-sm text-gray-500">Agree on a final price to proceed</p>
                                        </div>
                                    </div>
                                    <NegotiationRoom deal={deal} isBuyer={isBuyer} isAgent={isAgent} onUpdate={fetchDeal} />
                                </div>
                            </div>
                        ) : (
                            /* Timeline Mode - The "Canvas" */
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        Transaction Timeline
                                    </h2>
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase tracking-widest">
                                        Secure Enclave
                                    </span>
                                </div>
                                <div className="p-8">
                                    <DealTimeline deal={deal} isBuyer={isBuyer} isAgent={isAgent} onUpdate={fetchDeal} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === RIGHT COLUMN (4/12): Context & Tools === */}
                    <div className="lg:col-span-4 space-y-6 sticky top-24">

                        {/* 1. Property Context */}
                        <div className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm">
                            <div className="p-5 flex gap-4">
                                <div className="h-20 w-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                                    {deal.property.images?.[0] ?
                                        <img src={`${api.API_URL}/${deal.property.images[0].image_path}`} className="h-full w-full object-cover" /> :
                                        <div className="h-full w-full flex items-center justify-center text-gray-300"><Home size={20} /></div>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate mb-1">{deal.property.title}</h3>
                                    <p className="text-xs text-gray-500 truncate mb-3">{deal.property.address}</p>
                                    <Link href={`/properties/${deal.property.id}`} className="text-xs font-bold text-gray-900 hover:underline inline-flex items-center gap-1">
                                        View Property <ArrowLeft size={10} className="rotate-180" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* 2. Document Vault */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                                <h3 className="font-bold text-gray-900 text-sm">Document Vault</h3>
                            </div>
                            <div className="p-6">
                                <DocumentVault deal={deal} isBuyer={isBuyer} isAgent={isAgent} onUpdate={fetchDeal} />
                            </div>
                        </div>

                        {/* 3. Financials */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                                <h3 className="font-bold text-gray-900 text-sm">Financial Snapshot</h3>
                            </div>
                            <div className="p-6">
                                <FinancialBreakdown deal={deal} />
                            </div>
                        </div>

                        {/* 4. Support */}
                        <div className="bg-[#10141d] rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                            <div className="relative z-10">
                                <h3 className="font-bold mb-1">Questions?</h3>
                                <p className="text-gray-400 text-xs mb-4">Contact your agent or our support team.</p>
                                <div className="flex gap-2">
                                    <button className="flex-1 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                                        <Phone size={14} /> Call
                                    </button>
                                    <button className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 hover:bg-gray-100">
                                        <Mail size={14} /> Email
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
