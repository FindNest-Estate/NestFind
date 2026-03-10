"use client";

import { useEffect, useState, useMemo } from "react";
import {
    CommissionStatus,
    CommissionStatusResponse,
    COMMISSION_STATUS_LABELS,
    COMMISSION_STATUS_COLORS,
} from "@/lib/types/finance";
import { getCommissionStatus, authorizeCommission } from "@/lib/api/finance";
import {
    Loader2,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Gavel,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface CommissionPanelProps {
    dealId: string;
    currentUserRole: string;
}

export function CommissionPanel({ dealId, currentUserRole }: CommissionPanelProps) {
    const [data, setData] = useState<CommissionStatusResponse["commission"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState(false);
    const [authNotes, setAuthNotes] = useState("");
    const { showToast } = useToast();

    const fetchStatus = async () => {
        try {
            const response = await getCommissionStatus(dealId);
            if (response.success && response.commission) {
                setData(response.commission);
            }
        } catch (error) {
            console.error("Failed to fetch commission status", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [dealId]);

    const handleAuthorize = async () => {
        setAuthorizing(true);
        try {
            const result = await authorizeCommission(dealId, authNotes || undefined);
            if (result.success) {
                showToast("Commission settlement authorized", "success");
                setAuthNotes("");
                fetchStatus();
            } else {
                showToast("Authorization failed", "error");
            }
        } catch (error) {
            showToast("An unexpected error occurred", "error");
        } finally {
            setAuthorizing(false);
        }
    };

    // Cooling-off countdown
    const coolingOffRemaining = useMemo(() => {
        if (!data?.cooling_off_expires_at) return null;
        const expires = new Date(data.cooling_off_expires_at);
        const now = new Date();
        const diff = expires.getTime() - now.getTime();
        if (diff <= 0) return "Expired";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h remaining`;
    }, [data?.cooling_off_expires_at]);

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
    if (!data) return null;

    const isAdmin = currentUserRole === "ADMIN";
    const canAuthorize = isAdmin && data.status === "PAYABLE";
    const allConditionsMet = data.release_conditions
        ? Object.values(data.release_conditions).every((c) => c.met)
        : false;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-indigo-600" />
                    Commission Settlement
                </h3>
                <span
                    className={cn(
                        "text-xs px-2 py-1 rounded-full border font-medium",
                        COMMISSION_STATUS_COLORS[data.status]
                    )}
                >
                    {COMMISSION_STATUS_LABELS[data.status]}
                </span>
            </div>

            {/* Commission Amounts */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-3 text-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total</span>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                        ₹{data.total_commission.toLocaleString("en-IN")}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Agent</span>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">
                        ₹{data.agent_commission.toLocaleString("en-IN")}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Platform</span>
                    <div className="text-sm font-bold text-gray-600 mt-0.5">
                        ₹{data.platform_fee.toLocaleString("en-IN")}
                    </div>
                </div>
            </div>

            {/* Cooling-Off Timer */}
            {data.status === "COOLING_OFF" && coolingOffRemaining && (
                <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span className="text-sm text-amber-800 font-medium">
                        Cooling-off: {coolingOffRemaining}
                    </span>
                </div>
            )}

            {/* Release Conditions */}
            {data.release_conditions && (
                <div className="p-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Release Conditions
                    </h4>
                    <div className="space-y-1.5">
                        {Object.entries(data.release_conditions).map(([key, condition]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                                {condition.met ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                )}
                                <span className={cn("flex-1", condition.met ? "text-gray-700" : "text-gray-500")}>
                                    {condition.label}
                                </span>
                                <span className="text-xs text-gray-400">{condition.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Authorize */}
            {canAuthorize && (
                <div className="p-4 bg-purple-50/50 border-b border-gray-100">
                    <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-purple-900">Authorize Settlement</p>
                            <p className="text-xs text-purple-700 mt-0.5">
                                This records your approval. No money will be moved by NestFind.
                            </p>
                        </div>
                    </div>
                    <textarea
                        value={authNotes}
                        onChange={(e) => setAuthNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full text-sm border rounded-lg p-2 mb-2 resize-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                        rows={2}
                    />
                    <button
                        onClick={handleAuthorize}
                        disabled={authorizing || !allConditionsMet}
                        className={cn(
                            "w-full py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                            allConditionsMet
                                ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        {authorizing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        {allConditionsMet ? "Authorize Commission Release" : "Conditions Not Met"}
                    </button>
                </div>
            )}

            {/* Disclaimer */}
            <div className="bg-slate-50 p-2 text-center border-t border-gray-100">
                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Commission amounts are calculated records. NestFind does not hold or transfer funds.
                </p>
            </div>
        </div>
    );
}
