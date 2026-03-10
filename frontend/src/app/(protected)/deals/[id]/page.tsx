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
    Flag, ShieldAlert, Clock, Mail, Phone, Star, BedDouble, Bath, Square, IndianRupee, MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Link from "next/link";

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
            <div className="max-w-7xl mx-auto px-4 pt-24">

                {/* Topbar: Back + Report */}
                <div className="flex justify-between items-center mb-5">
                    <Link href="/deals" className="inline-flex items-center gap-1 text-xs text-[var(--gray-500)] hover:text-[var(--gray-700)]">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Deals
                    </Link>
                    {isActive && !deal.is_frozen && (
                        <button onClick={() => setIsDisputeModalOpen(true)}
                            className="text-xs text-[var(--gray-500)] hover:text-[var(--color-error)] flex items-center gap-1">
                            <Flag className="w-3.5 h-3.5" /> Report Issue
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
                    <div className={`mb-5 p-4 rounded-[var(--card-radius)] border flex items-center gap-3 ${isCancelled ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <div className="font-semibold text-sm">{isCancelled ? 'Deal Cancelled' : 'Deal Expired'}</div>
                            {deal.cancellation_reason && (
                                <div className="text-xs mt-0.5 opacity-80">Reason: {deal.cancellation_reason}</div>
                            )}
                            {deal.cancelled_at && (
                                <div className="text-xs mt-0.5 opacity-60">{format(new Date(deal.cancelled_at), "MMM d, yyyy 'at' h:mm a")}</div>
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
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <h2 className="text-sm font-semibold text-[var(--gray-900)] flex items-center gap-2 mb-4">
                                <IndianRupee className="w-4 h-4 text-emerald-600" /> Financial Summary
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">Agreed Price</div>
                                    <div className="font-semibold text-gray-900">
                                        {deal.agreed_price ? `₹${deal.agreed_price.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">Token Amount</div>
                                    <div className="font-semibold text-gray-900">
                                        {deal.token_amount ? `₹${deal.token_amount.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">Commission Amount</div>
                                    <div className="font-semibold text-gray-900">
                                        {deal.commission_amount ? `₹${deal.commission_amount.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500 mb-1">Platform Fee</div>
                                    <div className="font-semibold text-gray-900">
                                        {deal.platform_fee ? `₹${deal.platform_fee.toLocaleString('en-IN')}` : 'TBD'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Property Factsheet */}
                        {(deal.property.bedrooms != null || deal.property.bathrooms != null || deal.property.area_sqft != null) && (
                            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                                <h2 className="text-sm font-semibold text-[var(--gray-900)] flex items-center gap-2 mb-4">
                                    Property Factsheet
                                </h2>
                                <div className="flex flex-wrap gap-6 text-sm">
                                    {deal.property.bedrooms != null && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><BedDouble className="w-4 h-4" /></div>
                                            <span className="font-medium">{deal.property.bedrooms} Beds</span>
                                        </div>
                                    )}
                                    {deal.property.bathrooms != null && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-md"><Bath className="w-4 h-4" /></div>
                                            <span className="font-medium">{deal.property.bathrooms} Baths</span>
                                        </div>
                                    )}
                                    {deal.property.area_sqft != null && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <div className="p-2 bg-amber-50 text-amber-600 rounded-md"><Square className="w-4 h-4" /></div>
                                            <span className="font-medium">{deal.property.area_sqft.toLocaleString('en-IN')} Sq Ft</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Participant Contacts */}
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-4">Participants & Contacts</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { roleLabel: 'Buyer', data: deal.parties.buyer, color: 'blue' },
                                    { roleLabel: 'Seller', data: deal.parties.seller, color: 'orange' },
                                    { roleLabel: 'Agent', data: deal.parties.agent, color: 'purple' }
                                ].map(({ roleLabel, data, color }) => (
                                    <div key={roleLabel} className={`p-4 rounded-xl border bg-${color}-50/30 border-${color}-100 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold tracking-wider uppercase text-${color}-600 bg-${color}-100 px-2 py-0.5 rounded-full`}>
                                                {roleLabel}
                                            </span>
                                            {(data as any).rating != null && (
                                                <div className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                                                    <Star className="w-3 h-3 fill-amber-500" /> {(data as any).rating}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="font-semibold text-gray-900 mb-0.5 truncate">{data.name}</div>
                                            <div className="text-xs text-gray-500 mb-3 truncate hover:text-gray-900 transition-colors">ID: {data.id.split('-')[0]}</div>
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            {data.email ? (
                                                <a href={`mailto:${data.email}`} className={`flex items-center gap-2 text-xs text-gray-600 hover:text-${color}-600 transition-colors truncate`}>
                                                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{data.email}</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Mail className="w-3.5 h-3.5" /> Hidden
                                                </div>
                                            )}
                                            {data.mobile_number ? (
                                                <a href={`tel:${data.mobile_number}`} className={`flex items-center gap-2 text-xs text-gray-600 hover:text-${color}-600 transition-colors`}>
                                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> <span>{data.mobile_number}</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Phone className="w-3.5 h-3.5" /> Hidden
                                                </div>
                                            )}
                                        </div>
                                        <div className={`mt-2 pt-3 border-t border-${color}-200/50`}>
                                            <button disabled className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-white border border-${color}-200 text-[10px] font-medium text-${color}-600 opacity-60 cursor-not-allowed`}>
                                                <MessageCircle className="w-3.5 h-3.5" /> Messaging coming soon! (Phase 3)
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
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[var(--color-info)]" /> Key Dates
                            </h2>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[var(--gray-500)]">Created</span>
                                    <span className="font-medium text-[var(--gray-900)]">{format(new Date(deal.created_at), "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--gray-500)]">Last Updated</span>
                                    <span className="font-medium text-[var(--gray-900)]">{format(new Date(deal.updated_at), "MMM d, h:mm a")}</span>
                                </div>
                                {deal.cancelled_at && (
                                    <div className="flex justify-between text-red-600">
                                        <span className="font-medium">Cancelled</span>
                                        <span className="font-bold">{format(new Date(deal.cancelled_at), "MMM d, yyyy")}</span>
                                    </div>
                                )}
                                {deal.registration_date && (
                                    <div className="flex justify-between bg-blue-50 p-2 rounded-[var(--radius-sm)]">
                                        <span className="text-[var(--color-info)] font-medium">Registration</span>
                                        <span className="font-bold text-blue-800">{format(new Date(deal.registration_date), "MMM d, yyyy")}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Linked Items */}
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Linked Items</h2>
                            <div className="space-y-2 text-xs">
                                {deal.visit_request_id && (
                                    <Link href={`/visits/${deal.visit_request_id}`} className="flex justify-between items-center p-2 rounded-lg bg-[var(--gray-50)] hover:bg-[var(--gray-100)] transition-colors">
                                        <span className="text-[var(--gray-500)] font-medium">Property Visit</span>
                                        <span className="text-[var(--color-brand)] font-mono text-[10px]">{deal.visit_request_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {deal.offer_id && (
                                    <Link href={`/offers/${deal.offer_id}`} className="flex justify-between items-center p-2 rounded-lg bg-[var(--gray-50)] hover:bg-[var(--gray-100)] transition-colors">
                                        <span className="text-[var(--gray-500)] font-medium">Original Offer</span>
                                        <span className="text-[var(--color-brand)] font-mono text-[10px]">{deal.offer_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {deal.reservation_id && (
                                    <Link href={`/reservations/${deal.reservation_id}`} className="flex justify-between items-center p-2 rounded-lg bg-[var(--gray-50)] hover:bg-[var(--gray-100)] transition-colors">
                                        <span className="text-[var(--gray-500)] font-medium">Reservation</span>
                                        <span className="text-[var(--color-brand)] font-mono text-[10px]">{deal.reservation_id.slice(0, 8)}…</span>
                                    </Link>
                                )}
                                {!deal.visit_request_id && !deal.offer_id && !deal.reservation_id && (
                                    <p className="text-[var(--gray-400)] text-center py-2">No linked items yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <button onClick={() => setShowTimeline(!showTimeline)} className="flex items-center justify-between w-full">
                                <h2 className="text-sm font-semibold text-[var(--gray-900)] flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[var(--gray-400)]" /> Activity Log
                                    <span className="text-[10px] font-bold bg-[var(--gray-100)] text-[var(--gray-500)] px-1.5 py-0.5 rounded-full">
                                        {deal.timeline?.length ?? 0}
                                    </span>
                                </h2>
                                {showTimeline ? <ChevronUp className="w-4 h-4 text-[var(--gray-400)]" /> : <ChevronDown className="w-4 h-4 text-[var(--gray-400)]" />}
                            </button>
                            {showTimeline && (
                                <div className="mt-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
            </div>
        </div>
    );
}
