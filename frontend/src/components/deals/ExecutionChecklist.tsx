"use client";

import { useState } from "react";
import { DealDetail, DealStatus } from "@/lib/types/deal";
import { transitionDeal } from "@/lib/api/deals";
import { CheckCircle2, Circle, Clock, FileText, DollarSign, Calendar, Loader2, Upload, ChevronRight } from "lucide-react";
import { BookingProofUpload } from "./BookingProofUpload";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

interface ExecutionChecklistProps {
    deal: DealDetail;
    currentUserRole: 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN';
    onRefresh: () => void;
}

type StepStatus = 'PENDING' | 'CURRENT' | 'COMPLETED';

interface ChecklistStep {
    id: string;
    title: string;
    description: string;
    status: StepStatus;
    icon: React.ElementType;
    renderAction?: () => React.ReactNode;
}

export function ExecutionChecklist({ deal, currentUserRole, onRefresh }: ExecutionChecklistProps) {
    const [openStep, setOpenStep] = useState<string | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const { showToast } = useToast();

    const getStepStatus = (stepIndex: number, currentStepIndex: number): StepStatus => {
        if (stepIndex < currentStepIndex) return 'COMPLETED';
        if (stepIndex === currentStepIndex) return 'CURRENT';
        return 'PENDING';
    };

    const doTransition = async (newStatus: string, notes?: string) => {
        setTransitioning(true);
        try {
            const result = await transitionDeal(deal.id, { new_status: newStatus, notes });
            if (result.success) {
                showToast(`Deal advanced to ${result.transition?.display_to || newStatus}`, "success");
                onRefresh();
            } else {
                showToast("Transition failed. Please try again.", "error");
            }
        } catch (err: any) {
            showToast(err?.message || "Unexpected error during transition", "error");
        } finally {
            setTransitioning(false);
        }
    };


    // Map deal status to the local step index
    const statusToStep: Partial<Record<DealStatus, number>> = {
        [DealStatus.PRICE_AGREED]: 0,
        [DealStatus.TOKEN_PENDING]: 0,
        [DealStatus.TOKEN_PAID]: 1,
        [DealStatus.AGREEMENT_SIGNED]: 2,
        [DealStatus.REGISTRATION]: 3,
        [DealStatus.COMPLETED]: 4,
        [DealStatus.COMMISSION_RELEASED]: 5,
    };
    const currentStepIndex = statusToStep[deal.status] ?? -1;

    // -----------------------------------------------------------------------
    // Step Definitions with real action handlers
    // -----------------------------------------------------------------------
    const steps: ChecklistStep[] = [
        {
            id: 'token',
            title: 'Booking Amount & Proof',
            description: 'Secure the deal by paying the booking token and uploading the payment proof.',
            status: getStepStatus(0, currentStepIndex),
            icon: DollarSign,
            renderAction: () => {
                if (currentUserRole === 'BUYER') {
                    if (deal.reservation && !deal.reservation.proof_url) {
                        return (
                            <div className="mt-4">
                                <BookingProofUpload
                                    dealId={deal.reservation.id}
                                    onUploadSuccess={onRefresh}
                                />
                            </div>
                        );
                    }
                    if (!deal.reservation) {
                        return (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
                                Pay the booking amount via bank transfer and upload the proof below.
                                {deal.token_amount && (
                                    <div className="mt-1 font-bold">Amount: ₹{deal.token_amount.toLocaleString('en-IN')}</div>
                                )}
                            </div>
                        );
                    }
                    if (deal.reservation?.proof_url) {
                        return (
                            <div className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Proof uploaded — awaiting agent verification.
                                <a href={deal.reservation.proof_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs underline text-blue-600">View Proof</a>
                            </div>
                        );
                    }
                }
                if ((currentUserRole === 'AGENT' || currentUserRole === 'ADMIN') && deal.reservation?.proof_url) {
                    return (
                        <button
                            onClick={() => doTransition(DealStatus.TOKEN_PAID, "Token payment verified by agent")}
                            disabled={transitioning}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
                        >
                            {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Verify Payment & Advance Deal
                        </button>
                    );
                }
                return null;
            }
        },
        {
            id: 'agreement',
            title: 'Sale Agreement',
            description: 'Draft, review, and sign the Sale Agreement between all parties.',
            status: getStepStatus(1, currentStepIndex),
            icon: FileText,
            renderAction: () => {
                if (currentStepIndex === 1) {
                    if (currentUserRole === 'AGENT' || currentUserRole === 'ADMIN') {
                        return (
                            <div className="mt-3 space-y-2">
                                <Link
                                    href={`/deals/${deal.id}/agreement`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload Agreement Draft
                                </Link>
                                <div className="text-xs text-gray-500">Or advance if agreement is signed by all parties:</div>
                                <button
                                    onClick={() => doTransition(DealStatus.AGREEMENT_SIGNED, "Sale agreement signed by all parties")}
                                    disabled={transitioning}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
                                >
                                    {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Mark Agreement Signed
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                            Waiting for agent to upload the agreement draft. You will be notified when it's ready to review.
                        </div>
                    );
                }
                return null;
            }
        },
        {
            id: 'registration',
            title: 'Registration Scheduling',
            description: 'Schedule a date for property registration at the sub-registrar office.',
            status: getStepStatus(2, currentStepIndex),
            icon: Calendar,
            renderAction: () => {
                if (currentStepIndex === 2) {
                    if (currentUserRole === 'AGENT' || currentUserRole === 'ADMIN') {
                        return (
                            <div className="mt-3 space-y-2">
                                <div className="text-xs text-gray-500 mb-1">
                                    {deal.registration_date
                                        ? `Registration scheduled for: ${new Date(deal.registration_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                        : "No date scheduled yet."}
                                </div>
                                <button
                                    onClick={() => doTransition(DealStatus.REGISTRATION, "Registration date scheduled")}
                                    disabled={transitioning}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-60"
                                >
                                    {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                    Advance to Registration
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                            {deal.registration_date
                                ? `Registration scheduled: ${new Date(deal.registration_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                                : "Waiting for agent to schedule registration date."}
                        </div>
                    );
                }
                return null;
            }
        },
        {
            id: 'completion',
            title: 'Final Handover & Completion',
            description: 'Property keys handed over, all paperwork finalised, deal closed.',
            status: getStepStatus(3, currentStepIndex),
            icon: CheckCircle2,
            renderAction: () => {
                if (currentStepIndex === 3 && (currentUserRole === 'AGENT' || currentUserRole === 'ADMIN')) {
                    return (
                        <button
                            onClick={() => doTransition(DealStatus.COMPLETED, "Property handover complete, deal finalised")}
                            disabled={transitioning}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
                        >
                            {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Mark Deal Complete
                        </button>
                    );
                }
                if (currentStepIndex === 3 && currentUserRole === 'BUYER') {
                    return (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700">
                            Registration in progress. Your agent will finalise the deal after key handover.
                        </div>
                    );
                }
                return null;
            }
        },
    ];

    // -----------------------------------------------------------------------
    // Render: only show checklist if deal has reached TOKEN_PENDING
    // -----------------------------------------------------------------------
    if (currentStepIndex < 0) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-[var(--color-brand)]" />
                    <h2 className="text-sm font-bold text-[var(--gray-900)]">Execution Checklist</h2>
                </div>
                <div className="p-4 bg-[var(--gray-50)] rounded-lg text-center text-sm text-[var(--gray-500)]">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-[var(--gray-300)]" />
                    Checklist unlocks once price is agreed and token payment is due.
                    <div className="mt-2">
                        <span className="font-medium text-[var(--gray-700)]">Current Stage:</span>{' '}
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                            {deal.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
            <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-brand)]" />
                <h2 className="text-sm font-bold text-[var(--gray-900)]">Execution Checklist</h2>
            </div>
            <div className="space-y-1">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === steps.length - 1;
                    return (
                        <div key={step.id} className="relative pl-9">
                            {/* Connector line */}
                            {!isLast && (
                                <div className={`absolute left-[14px] top-8 bottom-0 w-0.5 ${step.status === 'COMPLETED' ? 'bg-emerald-200' : 'bg-[var(--gray-100)]'}`} />
                            )}

                            {/* Icon bubble */}
                            <div className={`absolute left-0 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2 ${step.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                    step.status === 'CURRENT' ? 'bg-blue-600 border-blue-600 text-white' :
                                        'bg-white border-[var(--gray-200)] text-[var(--gray-400)]'
                                }`}>
                                {step.status === 'COMPLETED' ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : step.status === 'CURRENT' ? (
                                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                                ) : (
                                    <Icon className="w-3.5 h-3.5" />
                                )}
                            </div>

                            {/* Content */}
                            <div className={`pb-7 transition-opacity ${step.status === 'PENDING' ? 'opacity-40' : ''}`}>
                                <h3 className={`text-sm font-semibold ${step.status === 'CURRENT' ? 'text-blue-700' : 'text-[var(--gray-900)]'}`}>
                                    {step.title}
                                    {step.status === 'COMPLETED' && (
                                        <span className="ml-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Done</span>
                                    )}
                                </h3>
                                <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-relaxed">{step.description}</p>

                                {step.status === 'CURRENT' && step.renderAction && (
                                    <div className="mt-1">
                                        {step.renderAction()}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
