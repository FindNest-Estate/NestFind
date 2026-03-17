"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDeal, cancelDeal } from "@/lib/api/deals";
import { getDealDisputes } from "@/lib/api/disputes";
import { DealDetail, DealStatus, DEAL_STATUS_LABELS, ACTIVE_DEAL_STATUSES } from "@/lib/types/deal";
import { Dispute } from "@/lib/types/disputes";
import { DealHeader } from "@/components/deals/DealHeader";
import { DealStatusStepper } from "@/components/deals/DealStatusStepper";
import { ExecutionChecklist } from "@/components/deals/ExecutionChecklist";
import { DealTimeline } from "@/components/deals/DealTimeline";
import { FinancialTimeline } from "@/components/deals/FinancialTimeline";
import { DisputeBanner } from "@/components/deals/DisputeBanner";
import { DisputeModal } from "@/components/deals/DisputeModal";
import { useToast } from "@/components/ui/Toast";
import {
    Loader2, ArrowLeft, Calendar, AlertTriangle, ChevronUp, ChevronDown,
    Flag, ShieldAlert, Clock, Mail, Phone, Star, BedDouble, Bath, Square, IndianRupee, MessageCircle, Link2, Key, Home, CarFront, Sofa, Compass, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DealWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const dealId = params.id as string;

    const [deal, setDeal] = useState<DealDetail | null>(null);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [showTimeline, setShowTimeline] = useState(true);
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

    const { showToast } = useToast();

    const fetchDeal = useCallback(async () => {
        try {
            const [dealRes, disputeRes] = await Promise.all([
                getDeal(dealId),
                getDealDisputes(dealId).catch(() => ({ success: false, disputes: [] as Dispute[] })),
            ]);

            if (dealRes.success) {
                setDeal(dealRes.deal);
            } else {
                showToast("Failed to load deal details.", "error");
            }

            if (disputeRes.success && disputeRes.disputes) {
                setDisputes(disputeRes.disputes);
            }
        } catch (error) {
            console.error(error);
            showToast("An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    }, [dealId, showToast]);

    useEffect(() => {
        if (dealId) fetchDeal();
    }, [dealId, fetchDeal]);

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            await cancelDeal(dealId, cancelReason || undefined);
            setShowCancelConfirm(false);
            setCancelReason("");
            await fetchDeal();
            showToast("The deal has been cancelled successfully.", "success");
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Failed to cancel deal", "error");
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--gray-500)]">Loading Deal Workspace…</p>
                </div>
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="min-h-screen bg-[var(--gray-50)]">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 pt-24 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[var(--color-error)]" />
                    <p className="text-sm text-[var(--color-error)]">Deal not found or access denied.</p>
                    <button onClick={() => router.push("/deals")}
                        className="mt-3 text-sm text-[var(--color-brand)] hover:underline">
                        Back to Deals
                    </button>
                </div>
            </div>
        );
    }

    const currentUserRole = (deal.viewer_role || 'BUYER') as 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN';
    const isActive = ACTIVE_DEAL_STATUSES.has(deal.status);
    const isCancelled = deal.status === DealStatus.CANCELLED;
    const isExpired = deal.status === DealStatus.EXPIRED;
    const canCancel = isActive && ['BUYER', 'SELLER', 'ADMIN'].includes(currentUserRole) && !deal.is_frozen;
    const openDispute = disputes.find(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW');

    return (
        <div className="min-h-screen bg-[var(--gray-50)] pb-20">
            <Navbar />
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-7xl mx-auto px-4 pt-[88px]"
            >

                {/* Topbar: Back + Report */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/deals" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <ArrowLeft className="w-4 h-4" /> Back to Deals
                    </Link>
                    {isActive && !deal.is_frozen && (
                        <button onClick={() => setIsDisputeModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full border border-gray-200 text-xs font-bold text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <Flag className="w-4 h-4" /> Report Issue
                        </button>
                    )}
                </div>

                {/* Dispute Banner — shows real dispute data from API */}
                {deal.is_frozen ? (
                    <DisputeBanner
                        isFrozen={deal.is_frozen}
                        freezeReason={deal.freeze_reason}
                        onViewDisputes={openDispute
                            ? () => router.push(`/disputes/${openDispute.id}`)
                            : undefined}
                    />
                ) : null}

                {/* Terminated states */}
                {(isCancelled || isExpired) && (
                    <div className={`mb-6 p-5 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${isCancelled ? 'bg-red-50/80 border-red-200 text-red-900 shadow-[0_4px_20px_rgba(239,68,68,0.05)]' : 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-[0_4px_20px_rgba(245,158,11,0.05)]'
                        }`}>
                        <div className={`p-3 rounded-2xl shadow-sm ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-lg tracking-tight mb-1">{isCancelled ? 'Deal Cancelled' : 'Deal Expired'}</div>
                            {deal.cancellation_reason && (
                                <div className="text-sm font-medium opacity-90 flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${isCancelled ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>Reason</span>
                                    {deal.cancellation_reason}
                                </div>
                            )}
                            {deal.cancelled_at && (
                                <div className="text-[10px] font-black tracking-widest uppercase mt-2 opacity-60 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {format(new Date(deal.cancelled_at), "MMM d, yyyy 'at' h:mm a")}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Header Card */}
                <DealHeader deal={deal} />

                {/* Progress Stepper */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-4 mb-6 overflow-x-auto">
                    <DealStatusStepper currentStatus={deal.status} isCancelled={isCancelled} isExpired={isExpired} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left: Main Action Area ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Execution Checklist */}
                        <div className={deal.is_frozen ? "opacity-50 pointer-events-none grayscale" : ""}>
                            <ExecutionChecklist deal={deal} currentUserRole={currentUserRole} onRefresh={fetchDeal} />
                        </div>

                        {/* Open Disputes Section */}
                        {disputes.length > 0 && (
                            <div className="bg-white rounded-[var(--card-radius)] border border-red-100 p-5">
                                <h2 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
                                    <ShieldAlert className="w-4 h-4" /> Active Disputes ({disputes.filter(d => ['OPEN', 'UNDER_REVIEW'].includes(d.status)).length})
                                </h2>
                                <div className="space-y-3">
                                    {disputes.map(dispute => (
                                        <Link
                                            href={`/disputes/${dispute.id}`}
                                            key={dispute.id}
                                            className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100 hover:border-red-200 transition-colors"
                                        >
                                            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-semibold text-red-800 capitalize">
                                                        {dispute.type?.replace(/_/g, ' ').toLowerCase()}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${dispute.status === 'OPEN' ? 'bg-red-200 text-red-800' :
                                                        dispute.status === 'UNDER_REVIEW' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {dispute.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-red-600 mt-1 truncate">{dispute.description}</p>
                                                <div className="text-[10px] text-red-400 mt-1">
                                                    Filed {format(new Date(dispute.created_at), "MMM d, h:mm a")}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Financial Summary */}
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-5 tracking-tight">
                                <IndianRupee className="w-5 h-5 text-emerald-600" /> Financial Summary
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Agreed Price</div>
                                    <div className="font-bold text-gray-900 text-lg tracking-tight">
                                        {deal.agreed_price ? `₹${deal.agreed_price.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Token Amount</div>
                                    <div className="font-bold text-gray-900 text-lg tracking-tight">
                                        {deal.token_amount ? `₹${deal.token_amount.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">Commission <span className="text-gray-300">/ Total</span></div>
                                    <div className="font-bold text-gray-900 text-lg tracking-tight">
                                        {deal.commission_amount ? `₹${deal.commission_amount.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 transition-colors">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 text-purple-600">↳ Agent Split</div>
                                    <div className="font-bold text-gray-900 text-lg tracking-tight text-purple-700">
                                        {deal.agent_commission ? `₹${deal.agent_commission.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 transition-colors">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform Fee</div>
                                    <div className="font-bold text-gray-900 text-lg tracking-tight">
                                        {deal.platform_fee ? `₹${deal.platform_fee.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Property Factsheet */}
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-5 tracking-tight">
                                <Home className="w-5 h-5 text-indigo-500" /> Property Factsheet
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {deal.property.bedrooms != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shadow-sm"><BedDouble className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-blue-500 tracking-widest mb-0.5">Rooms</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.bedrooms} Beds</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.bathrooms != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50/50 border border-cyan-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg shadow-sm"><Bath className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-cyan-500 tracking-widest mb-0.5">Baths</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.bathrooms}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.area_sqft != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50/50 border border-amber-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shadow-sm"><Square className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-0.5">Area</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.area_sqft.toLocaleString('en-IN')} SQFT</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.property_sub_type && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm"><Home className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-widest mb-0.5">Sub Type</div>
                                                <div className="font-bold tracking-tight text-sm capitalize">{deal.property.property_sub_type.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.ownership_type && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-teal-50/50 border border-teal-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-teal-100 text-teal-700 rounded-lg shadow-sm"><Key className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-teal-500 tracking-widest mb-0.5">Ownership</div>
                                                <div className="font-bold tracking-tight text-sm capitalize">{deal.property.ownership_type.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.parking_available != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-rose-50/50 border border-rose-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shadow-sm"><CarFront className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-rose-500 tracking-widest mb-0.5">Parking</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.parking_available ? (deal.property.parking_count ? `${deal.property.parking_count} Slot(s)` : 'Yes') : 'No'}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.furnishing_status && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shadow-sm"><Sofa className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-orange-500 tracking-widest mb-0.5">Furnished</div>
                                                <div className="font-bold tracking-tight text-sm capitalize">{deal.property.furnishing_status.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.facing_direction && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-lime-50/50 border border-lime-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-lime-100 text-lime-700 rounded-lg shadow-sm"><Compass className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-lime-500 tracking-widest mb-0.5">Facing</div>
                                                <div className="font-bold tracking-tight text-sm capitalize">{deal.property.facing_direction}</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.property_age_years != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-stone-50/50 border border-stone-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-stone-200 text-stone-700 rounded-lg shadow-sm"><Calendar className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-0.5">Age</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.property_age_years} Years</div>
                                            </div>
                                        </div>
                                    )}
                                    {deal.property.total_floors != null && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl text-gray-700 flex-1 min-w-[120px]">
                                            <div className="p-2 bg-fuchsia-100 text-fuchsia-700 rounded-lg shadow-sm"><ChevronUp className="w-4 h-4" /></div>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold text-fuchsia-500 tracking-widest mb-0.5">Floor</div>
                                                <div className="font-bold tracking-tight text-sm">{deal.property.floor_number ?? 'G'} / {deal.property.total_floors}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        {/* Participant Contacts */}
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-bold text-gray-900 mb-5 tracking-tight">Participants & Contacts</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { roleLabel: 'Buyer', data: deal.parties.buyer, color: 'blue' },
                                    { roleLabel: 'Seller', data: deal.parties.seller, color: 'orange' },
                                    { roleLabel: 'Agent', data: deal.parties.agent, color: 'purple' }
                                ].map(({ roleLabel, data, color }) => (
                                    <div key={roleLabel} className={`p-5 rounded-2xl border bg-${color}-50/30 border-${color}-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-black tracking-widest uppercase text-${color}-700 bg-${color}-100 px-2.5 py-1 rounded-full`}>
                                                {roleLabel}
                                            </span>
                                            {(data as any).rating != null && (
                                                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {(data as any).rating}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="font-bold text-gray-900 text-lg mb-0.5 truncate tracking-tight">{data.name}</div>
                                            <div className="text-[10px] font-mono font-semibold text-gray-400 mb-3 truncate hover:text-gray-900 transition-colors tracking-widest">ID: {data.id.split('-')[0]}</div>
                                        </div>

                                        <div className="space-y-2.5 mt-auto">
                                            {data.email ? (
                                                <a href={`mailto:${data.email}`} className={`flex items-center gap-2.5 text-xs text-gray-600 hover:text-${color}-600 transition-colors truncate font-medium`}>
                                                    <div className={`p-1.5 rounded-md bg-${color}-100 text-${color}-600`}><Mail className="w-3.5 h-3.5 flex-shrink-0" /></div>
                                                    <span className="truncate">{data.email}</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2.5 text-xs text-gray-400 font-medium">
                                                    <div className="p-1.5 rounded-md bg-gray-100 text-gray-400"><Mail className="w-3.5 h-3.5" /></div> Hidden
                                                </div>
                                            )}
                                            {data.mobile_number ? (
                                                <a href={`tel:${data.mobile_number}`} className={`flex items-center gap-2.5 text-xs text-gray-600 hover:text-${color}-600 transition-colors font-medium`}>
                                                    <div className={`p-1.5 rounded-md bg-${color}-100 text-${color}-600`}><Phone className="w-3.5 h-3.5 flex-shrink-0" /></div>
                                                    <span>{data.mobile_number}</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2.5 text-xs text-gray-400 font-medium">
                                                    <div className="p-1.5 rounded-md bg-gray-100 text-gray-400"><Phone className="w-3.5 h-3.5" /></div> Hidden
                                                </div>
                                            )}
                                        </div>
                                        <div className={`mt-3 pt-4 border-t border-${color}-200/50`}>
                                            <button disabled className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-${color}-200 text-xs font-bold tracking-tight text-${color}-600 opacity-60 cursor-not-allowed`}>
                                                <MessageCircle className="w-4 h-4" /> Message User
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cancel Zone */}
                        {isActive && canCancel && (
                            <div className="bg-white rounded-[var(--card-radius)] border border-red-100 p-5">
                                {!showCancelConfirm ? (
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-sm font-medium text-[var(--gray-900)]">Need to cancel this deal?</h3>
                                            <p className="text-xs text-[var(--gray-500)]">Cancelling will revert the property status to active.</p>
                                        </div>
                                        <button onClick={() => setShowCancelConfirm(true)}
                                            className="px-3 py-1.5 border border-red-200 text-[var(--color-error)] rounded-[var(--radius-sm)] text-xs font-medium hover:bg-red-50">
                                            Cancel Deal
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 rounded-[var(--radius-sm)] p-5">
                                        <h3 className="text-sm font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" /> Confirm Cancellation
                                        </h3>
                                        <p className="text-xs text-red-600 mb-3">Are you sure? This action cannot be undone.</p>
                                        <textarea
                                            placeholder="Reason for cancellation (required)"
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            className="w-full px-3 py-2 border border-red-200 rounded-[var(--radius-sm)] text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                            rows={2}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setShowCancelConfirm(false)}
                                                className="px-3 py-1.5 bg-white border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-xs text-[var(--gray-700)] hover:bg-[var(--gray-50)]">
                                                Keep Deal
                                            </button>
                                            <button onClick={handleCancel} disabled={isCancelling || !cancelReason.trim()}
                                                className="px-3 py-1.5 bg-[var(--color-error)] text-white rounded-[var(--radius-sm)] text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                                                {isCancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                                                Confirm Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Right Sidebar ── */}
                    <div className="space-y-5">
                        {/* Financial Ledger */}
                        <FinancialTimeline dealId={dealId} currentUserRole={currentUserRole} />

                        {/* Key Dates */}
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-tight">
                                <Calendar className="w-4 h-4 text-blue-500" /> Key Dates
                            </h2>
                            <div className="space-y-3.5 text-xs">
                                <div className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 font-medium">Created</span>
                                    <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{format(new Date(deal.created_at), "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 font-medium">Last Updated</span>
                                    <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{format(new Date(deal.updated_at), "MMM d, h:mm a")}</span>
                                </div>
                                {deal.cancelled_at && (
                                    <div className="flex justify-between items-center bg-red-50 p-2.5 rounded-lg border border-red-100 text-red-700">
                                        <span className="font-bold">Cancelled</span>
                                        <span className="font-black tracking-widest bg-white px-2 py-1 rounded-md shadow-sm">{format(new Date(deal.cancelled_at), "MMM d, yyyy")}</span>
                                    </div>
                                )}
                                {deal.registration_date && (
                                    <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-blue-800">
                                        <span className="font-bold">Registration</span>
                                        <span className="font-black tracking-widest bg-white px-2 py-1 rounded-md shadow-sm border-blue-100">{format(new Date(deal.registration_date), "MMM d, yyyy")}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Linked Items */}
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-bold text-gray-900 mb-4 tracking-tight flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-purple-500" /> Linked Items
                            </h2>
                            <div className="space-y-2.5 text-xs">
                                {deal.visit_request_id && (
                                    <Link href={`/visits/${deal.visit_request_id}`} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-purple-50 hover:border-purple-100 border border-gray-100 transition-colors group">
                                        <span className="text-gray-600 font-bold group-hover:text-purple-700 transition-colors">Property Visit</span>
                                        <span className="text-gray-400 font-mono text-[10px] bg-white px-2 py-1 rounded-md shadow-sm group-hover:text-purple-600 transition-colors">{deal.visit_request_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {deal.offer_id && (
                                    <Link href={`/offers/${deal.offer_id}`} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:border-indigo-100 border border-gray-100 transition-colors group">
                                        <span className="text-gray-600 font-bold group-hover:text-indigo-700 transition-colors">Original Offer</span>
                                        <span className="text-gray-400 font-mono text-[10px] bg-white px-2 py-1 rounded-md shadow-sm group-hover:text-indigo-600 transition-colors">{deal.offer_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {deal.reservation_id && (
                                    <Link href={`/reservations/${deal.reservation_id}`} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-cyan-50 hover:border-cyan-100 border border-gray-100 transition-colors group">
                                        <span className="text-gray-600 font-bold group-hover:text-cyan-700 transition-colors">Reservation</span>
                                        <span className="text-gray-400 font-mono text-[10px] bg-white px-2 py-1 rounded-md shadow-sm group-hover:text-cyan-600 transition-colors">{deal.reservation_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {!deal.visit_request_id && !deal.offer_id && !deal.reservation_id && (
                                    <p className="text-gray-400 text-center py-4 text-sm font-medium bg-gray-50/50 rounded-xl border border-gray-100 border-dashed">No linked items yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="glass-card p-0 overflow-hidden">
                            <button onClick={() => setShowTimeline(!showTimeline)} className="flex items-center justify-between w-full p-6 bg-gradient-to-r from-gray-50 to-white hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 tracking-tight">
                                    <Clock className="w-4 h-4 text-gray-400" /> Activity Log
                                    <span className="text-[10px] font-black tracking-widest bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full shadow-sm">
                                        {deal.timeline?.length ?? 0}
                                    </span>
                                </h2>
                                {showTimeline ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>
                            {showTimeline && (
                                <div className="p-5 bg-white/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <DealTimeline events={deal.timeline ?? []} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DisputeModal
                    dealId={dealId}
                    isOpen={isDisputeModalOpen}
                    onClose={() => setIsDisputeModalOpen(false)}
                    onSuccess={fetchDeal}
                    currentUserRole={currentUserRole}
                />
            </motion.div>
        </div>
    );
}
