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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Financial Ledger
                </h3>
                <span className="text-xs font-mono text-gray-400">REF: {ledger.id.slice(0, 8)}</span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-4 text-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Deal Value</span>
                    <div className="text-lg font-bold text-gray-900 mt-1">₹{ledger.total_deal_value.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-4 text-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Commission</span>
                    <div className="text-lg font-bold text-gray-700 mt-1">₹{ledger.total_commission.toLocaleString('en-IN')}</div>
                    {ledger.commission_status && (
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border uppercase mt-1 inline-block",
                            COMMISSION_STATUS_COLORS[ledger.commission_status]
                        )}>
                            {COMMISSION_STATUS_LABELS[ledger.commission_status]}
                        </span>
                    )}
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-4 space-y-4 relative">
                {ledger.entries.map((entry) => (
                    <div key={entry.id} className="relative pl-6 border-l-2 border-gray-200 last:border-0 pb-1">
                        {/* Timeline Dot */}
                        <div className={cn(
                            "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white",
                            entry.verification_status === 'VERIFIED' ? "border-emerald-500 text-emerald-500" : "border-gray-300 text-gray-300"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full m-0.5", entry.verification_status === 'VERIFIED' ? "bg-emerald-500" : "bg-gray-300")} />
                        </div>

                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900">{ENTRY_TYPE_LABELS[entry.type]}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-gray-400">{format(new Date(entry.created_at), "MMM d, h:mm a")}</span>
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded border uppercase",
                                        entry.verification_status === 'VERIFIED' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                            entry.verification_status === 'REJECTED' ? "bg-red-50 border-red-200 text-red-700" :
                                                "bg-gray-50 border-gray-200 text-gray-500"
                                    )}>
                                        {VERIFICATION_LABELS[entry.verification_status]}
                                    </span>

                                    {/* Phase 5A: Counterparty confirmation badge */}
                                    {confirmableTypes.includes(entry.type) ? (
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5",
                                            entry.counterparty_confirmed
                                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                                : "bg-yellow-50 border-yellow-200 text-yellow-700"
                                        )}>
                                            <UserCheck className="w-2.5 h-2.5" />
                                            {entry.counterparty_confirmed ? "Confirmed" : "Awaiting Confirmation"}
                                        </span>
                                    ) : null}

                                    {/* Phase 5A: Proof link */}
                                    {entry.metadata?.proof_url && (
                                        <a
                                            href={entry.metadata.proof_url as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                        >
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            Proof
                                        </a>
                                    )}
                                </div>

                                {/* Phase 5A: Payment method badge */}
                                {entry.metadata?.payment_method && (
                                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                                        Method: {entry.metadata.payment_method as string}
                                        {entry.metadata.bank_reference && ` · Ref: ${entry.metadata.bank_reference as string}`}
                                    </span>
                                )}
                            </div>

                            <div className="text-right flex-shrink-0 ml-2">
                                <div className={cn(
                                    "font-mono text-sm font-medium",
                                    entry.direction === 'CREDIT' ? "text-emerald-700" :
                                        entry.direction === 'DEBIT' ? "text-slate-700" : "text-gray-500"
                                )}>
                                    {entry.direction === 'DEBIT' ? '-' : '+'}₹{entry.amount.toLocaleString('en-IN')}
                                </div>

                                {/* Verification Action */}
                                {(entry.type === 'BOOKING_DECLARED' || entry.type === 'BOOKING_RECEIVED') && entry.verification_status === 'PENDING' && canVerify && (
                                    <button
                                        onClick={() => handleVerify(entry.id)}
                                        disabled={!!verifying}
                                        className="mt-2 text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors flex items-center gap-1 ml-auto"
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
                                        className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1 ml-auto"
                                    >
                                        {confirming === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                        Confirm
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))}

                {ledger.entries.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-4">No financial records yet.</p>
                )}
            </div>

            <div className="bg-slate-50 p-2 text-center border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    NestFind does not process payments. All amounts are ledger records only.
                </p>
            </div>
        </div>
    );
}
