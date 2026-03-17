"use client";

import { useState } from "react";
import { DealDetail, DealStatus } from "@/lib/types/deal";
import { transitionDeal } from "@/lib/api/deals";
import { CheckCircle2, Circle, Clock, FileText, DollarSign, Calendar, Loader2, Upload, ChevronRight, AlertCircle } from "lucide-react";
import { BookingProofUpload } from "./BookingProofUpload";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { motion } from "framer-motion";

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
            <div className="glass-card border border-gray-200 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-300" />
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Execution Checklist</h2>
                </div>
                <div className="p-6 bg-gray-50/50 rounded-xl text-center text-sm text-gray-500 border border-gray-100 border-dashed">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="max-w-xs mx-auto">Checklist unlocks once the price is agreed and the initial token payment is due.</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <span className="font-medium text-gray-600 text-xs uppercase tracking-wider">Current Stage:</span>
                        <span className="text-blue-700 font-bold block">{deal.display_status || deal.status.replace(/_/g, ' ')}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-purple-600" />
            
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Execution Checklist</h2>
                    <p className="text-xs text-gray-500 font-medium">Complete these milestones to close the deal.</p>
                </div>
            </div>

            <motion.div 
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
            >
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === steps.length - 1;
                    const isCurrent = step.status === 'CURRENT';
                    const isCompleted = step.status === 'COMPLETED';
                    const isPending = step.status === 'PENDING';

                    return (
                        <motion.div 
                            key={step.id} 
                            variants={{
                                hidden: { opacity: 0, x: -20 },
                                visible: { opacity: 1, x: 0 }
                            }}
                            className="relative"
                        >
                            {/* Connector line */}
                            {!isLast && (
                                <div className={`absolute left-[19px] top-10 bottom-[-16px] w-[2px] z-0 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            )}

                            <div className={`relative z-10 flex gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${
                                isCurrent 
                                    ? 'bg-blue-50/50 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] scale-[1.02] transform-gpu' 
                                    : isCompleted
                                        ? 'bg-white border-emerald-100 hover:border-emerald-200'
                                        : 'bg-gray-50/50 border-transparent opacity-60 grayscale-[0.5]'
                            }`}>
                                {/* Icon bubble */}
                                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 shadow-sm ${
                                    isCompleted 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : isCurrent 
                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                            : 'bg-white border-gray-300 text-gray-400'
                                    }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : isCurrent ? (
                                        <Clock className="w-5 h-5 animate-pulse" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className={`text-base font-bold tracking-tight ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {step.title}
                                            </h3>
                                            <p className={`text-sm mt-1 leading-relaxed ${isCurrent ? 'text-blue-700/80' : 'text-gray-500'}`}>
                                                {step.description}
                                            </p>
                                        </div>
                                        {isCompleted && (
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black tracking-widest rounded-full">
                                                Done
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] uppercase font-black tracking-widest rounded-full animate-pulse">
                                                Action Required
                                            </span>
                                        )}
                                    </div>

                                    {isCurrent && step.renderAction && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 pt-4 border-t border-blue-200/50"
                                        >
                                            {step.renderAction()}
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
