"use client";

import { DealStatus, DEAL_LIFECYCLE_STEPS, DEAL_STATUS_LABELS } from "@/lib/types/deal";
import { CheckCircle, Circle, Clock, XCircle } from "lucide-react";

interface DealStatusStepperProps {
    currentStatus: DealStatus;
    isCancelled?: boolean;
    isExpired?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    completed: "text-emerald-600",
    current: "text-blue-600",
    pending: "text-gray-300",
    cancelled: "text-red-500",
};

export function DealStatusStepper({ currentStatus, isCancelled, isExpired }: DealStatusStepperProps) {
    const rawIndex = DEAL_LIFECYCLE_STEPS.indexOf(currentStatus);
    const currentIndex = rawIndex === -1 ? 0 : rawIndex; // Fallback so it doesn't break if status is weird

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-center min-w-[max-content] md:min-w-[900px] px-4 py-6">
                {DEAL_LIFECYCLE_STEPS.map((step, index) => {
                    let status: "completed" | "current" | "pending" | "cancelled";

                    if (isCancelled || isExpired) {
                        if (index < currentIndex) status = "completed";
                        else if (index === currentIndex) status = "cancelled";
                        else status = "pending";
                    } else {
                        if (index < currentIndex) status = "completed";
                        else if (index === currentIndex) status = "current";
                        else status = "pending";
                    }

                    const isLast = index === DEAL_LIFECYCLE_STEPS.length - 1;

                    return (
                        <div key={step} className="flex items-center flex-1">
                            {/* Step node */}
                            <div className="flex flex-col items-center relative z-10">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${status === "completed"
                                        ? "border-emerald-600 bg-emerald-50"
                                        : status === "current"
                                            ? "border-blue-600 bg-blue-50 ring-4 ring-blue-100"
                                            : status === "cancelled"
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-200 bg-white"
                                        }`}
                                >
                                    {status === "completed" && (
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    )}
                                    {status === "current" && (
                                        <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                                    )}
                                    {status === "cancelled" && (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    {status === "pending" && (
                                        <Circle className="w-4 h-4 text-gray-300" />
                                    )}
                                </div>
                                <span
                                    className={`text-[10px] sm:text-xs mt-2 text-center max-w-[80px] leading-tight font-medium ${status === 'completed' ? 'text-emerald-700' :
                                        status === 'current' ? 'text-blue-700 font-bold' :
                                            status === 'cancelled' ? 'text-red-600' :
                                                'text-gray-400'
                                        }`}
                                >
                                    {DEAL_STATUS_LABELS[step]}
                                </span>
                            </div>

                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className={`flex-1 h-0.5 -ml-4 -mr-4 z-0 transition-all ${index < currentIndex
                                        ? "bg-emerald-400"
                                        : "bg-gray-200"
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Terminal status badge */}
            {(isCancelled || isExpired) && (
                <div className="flex justify-center mt-2">
                    <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isCancelled
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                            }`}
                    >
                        <XCircle className="w-4 h-4" />
                        {isCancelled ? "Deal Cancelled" : "Deal Expired"}
                    </span>
                </div>
            )}
        </div>
    );
}
