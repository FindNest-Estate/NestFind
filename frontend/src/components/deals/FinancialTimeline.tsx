"use client";

import { useEffect, useState } from "react";
import {
    Ledger,
    LedgerEntry,
    LedgerEntryType,
    ENTRY_TYPE_LABELS,
    VERIFICATION_LABELS,
    COMMISSION_STATUS_LABELS,
    COMMISSION_STATUS_COLORS,
} from "@/lib/types/finance";
import { getDealLedger, verifyBookingDeclaration, confirmPaymentEntry } from "@/lib/api/finance";
import { format } from "date-fns";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    UserCheck,
    ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface FinancialTimelineProps {
    dealId: string;
    currentUserRole: string;
    currentUserId?: string;
}

export function FinancialTimeline({ dealId, currentUserRole, currentUserId }: FinancialTimelineProps) {
    const [ledger, setLedger] = useState<Ledger | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<string | null>(null);
    const { showToast } = useToast();

    const fetchLedger = async () => {
        try {
            const response = await getDealLedger(dealId);
            if (response.success && response.ledger) {
                setLedger(response.ledger);
            }
        } catch (error) {
            console.error("Failed to fetch ledger", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, [dealId]);

    const handleVerify = async (entryId: string) => {
        setVerifying(entryId);
        try {
            const result = await verifyBookingDeclaration(dealId, entryId, "VERIFIED");
            if (result.success) {
                showToast("Booking verification recorded", "success");
                fetchLedger();
            } else {
                showToast("Verification failed", "error");
            }
        } catch (error) {
            showToast("An unexpected error occurred", "error");
        } finally {
            setVerifying(null);
        }
    };

    const handleConfirm = async (entryId: string) => {
        setConfirming(entryId);
        try {
            const result = await confirmPaymentEntry(dealId, entryId);
            if (result.success) {
                showToast("Payment confirmed by counterparty", "success");
                fetchLedger();
            } else {
                showToast("Confirmation failed", "error");
            }
        } catch (error) {
            showToast("An unexpected error occurred", "error");
        } finally {
            setConfirming(null);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
    if (!ledger) return null;

    const canVerify = currentUserRole === 'AGENT' || currentUserRole === 'ADMIN';

    // Phase 5A entry types that support counterparty confirmation
    const confirmableTypes: LedgerEntryType[] = [
        'BOOKING_RECEIVED', 'BALANCE_PAYMENT_DECLARED',
        'TOKEN_FORFEITED', 'TOKEN_REFUND_CLAIMED', 'TOKEN_REFUNDED'
    ];

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Financial Ledger
                </h3>
                <span className="text-[10px] font-bold font-mono text-gray-400 tracking-widest bg-gray-100 px-2 py-1 rounded-md">REF: {ledger.id.slice(0, 8)}</span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100 bg-white/50">
                <div className="p-5 flex flex-col items-center justify-center transition-colors hover:bg-gray-50/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deal Value</span>
                    <div className="text-xl font-black text-gray-900 tracking-tight">₹{ledger.total_deal_value.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-5 flex flex-col items-center justify-center transition-colors hover:bg-gray-50/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform Commission</span>
                    <div className="text-xl font-bold text-gray-600 tracking-tight">₹{ledger.total_commission.toLocaleString('en-IN')}</div>
                    {ledger.commission_status && (
                        <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest mt-2 border",
                            COMMISSION_STATUS_COLORS[ledger.commission_status]
                        )}>
                            {COMMISSION_STATUS_LABELS[ledger.commission_status]}
                        </span>
                    )}
                </div>
            </div>            <div className="max-h-[400px] overflow-y-auto p-5 space-y-6 relative custom-scrollbar">
                {ledger.entries.map((entry) => {
                    const proofUrlStr = typeof entry.metadata?.proof_url === "string" ? entry.metadata.proof_url : "";
                    const paymentMethodStr = typeof entry.metadata?.payment_method === "string" ? entry.metadata.payment_method : "";
                    const bankRefStr = typeof entry.metadata?.bank_reference === "string" ? entry.metadata.bank_reference : "";

                    return (
                        <div key={entry.id} className="relative pl-6 border-l-2 border-gray-200 last:border-0 pb-2 group">
                            {/* Timeline Dot */}
                            <div className={cn(
                                "absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 bg-white transition-colors duration-300",
                                entry.verification_status === 'VERIFIED' ? "border-emerald-500 shadow-sm" : "border-gray-200"
                            )}>
                                <div className={cn("w-2 h-2 rounded-full m-0.5 transform -translate-x-[1px] -translate-y-[1px]", entry.verification_status === 'VERIFIED' ? "bg-emerald-500" : "bg-gray-300")} />
                            </div>

                            <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-4">
                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{ENTRY_TYPE_LABELS[entry.type]}</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{entry.description}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{format(new Date(entry.created_at), "MMM d, h:mm a")}</span>
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                                        entry.verification_status === 'VERIFIED' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                            entry.verification_status === 'REJECTED' ? "bg-red-50 border-red-200 text-red-700" :
                                                "bg-gray-50 border-gray-200 text-gray-500"
                                    )}>
                                        {VERIFICATION_LABELS[entry.verification_status]}
                                    </span>

                                    {/* Phase 5A: Counterparty confirmation badge */}
                                    {confirmableTypes.includes(entry.type) ? (
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-widest",
                                            entry.counterparty_confirmed
                                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                                : "bg-amber-50 border-amber-200 text-amber-700"
                                        )}>
                                            <UserCheck className="w-3 h-3" />
                                            {entry.counterparty_confirmed ? "Confirmed" : "Awaiting Confirmation"}
                                        </span>
                                    ) : null}

                                    {/* Phase 5A: Proof link */}
                                    {proofUrlStr && (
                                        <a
                                            href={proofUrlStr}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View Proof
                                        </a>
                                    )}
                                </div>

                                {/* Phase 5A: Payment method badge */}
                                {paymentMethodStr && (
                                    <span className="text-[10px] font-medium text-gray-400 mt-2 bg-gray-50/50 p-1.5 rounded-md border border-gray-100 inline-block">
                                        Method: <span className="text-gray-600">{paymentMethodStr}</span>
                                        {bankRefStr && <span className="ml-1 tracking-wider text-gray-500">· Ref: {bankRefStr}</span>}
                                    </span>
                                )}
                            </div>

                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <div className={cn(
                                    "font-mono text-base font-bold",
                                    entry.direction === 'CREDIT' ? "text-emerald-600" :
                                        entry.direction === 'DEBIT' ? "text-slate-800" : "text-gray-500"
                                )}>
                                    {entry.direction === 'DEBIT' ? '-' : '+'}₹{entry.amount.toLocaleString('en-IN')}
                                </div>

                                {/* Verification Action */}
                                {((entry.type === 'BOOKING_DECLARED' || entry.type === 'BOOKING_RECEIVED') && entry.verification_status === 'PENDING' && canVerify) && (
                                    <button
                                        onClick={() => handleVerify(entry.id)}
                                        disabled={!!verifying}
                                        className="mt-3 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        {verifying === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                        Verify
                                    </button>
                                )}

                                {/* Phase 5A: Counterparty Confirm Action */}
                                {confirmableTypes.includes(entry.type) && !entry.counterparty_confirmed ? (
                                    <button
                                        onClick={() => handleConfirm(entry.id)}
                                        disabled={!!confirming}
                                        className="mt-3 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        {confirming === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                        Confirm
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}

                {ledger.entries.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full mb-3 mx-auto bg-gray-50 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No financial records yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Transactions will appear here once initiated.</p>
                    </div>
                )}
            </div>

            <div className="bg-gray-50/50 p-3 text-center border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Ledger entries are records only. NestFind does not collect payments.
                </p>
            </div>
        </div>
    );
}
