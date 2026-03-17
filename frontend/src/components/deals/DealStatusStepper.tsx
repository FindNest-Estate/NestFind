"use client";

import { DealStatus, DEAL_LIFECYCLE_STEPS, DEAL_STATUS_LABELS } from "@/lib/types/deal";
import { Check, Dot, X, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface DealStatusStepperProps {
    currentStatus: DealStatus;
    isCancelled?: boolean;
    isExpired?: boolean;
}

export function DealStatusStepper({ currentStatus, isCancelled, isExpired }: DealStatusStepperProps) {
    const rawIndex = DEAL_LIFECYCLE_STEPS.indexOf(currentStatus);
    const currentIndex = rawIndex === -1 ? 0 : rawIndex; // Fallback

    return (
        <div className="w-full overflow-x-auto py-6 custom-scrollbar relative">
            <div className="flex items-center min-w-[max-content] md:min-w-[1200px] px-4 relative">
                
                {/* Background Track Line */}
                <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-100 rounded-full -translate-y-1/2 z-0" />
                
                {/* Fill Track Line */}
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentIndex / (DEAL_LIFECYCLE_STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`absolute top-1/2 left-8 h-1 rounded-full -translate-y-1/2 z-0 ${isCancelled || isExpired ? 'bg-red-300' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} 
                />

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

                    return (
                        <div key={step} className="flex flex-col items-center flex-1 relative z-10 group">
                            
                            {/* Step Node Marker */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                                        status === "completed"
                                            ? "border-white bg-emerald-500 shadow-md"
                                            : status === "current"
                                                ? "border-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] ring-4 ring-blue-100 scale-125"
                                                : status === "cancelled"
                                                    ? "border-white bg-red-500 shadow-md"
                                                    : "border-white bg-gray-200"
                                    }`}
                                >
                                    {status === "completed" && <Check className="w-4 h-4 text-white stroke-[3]" />}
                                    {status === "current" && <Dot className="w-6 h-6 text-white stroke-[4] animate-pulse" />}
                                    {status === "cancelled" && <X className="w-4 h-4 text-white stroke-[3]" />}
                                    {status === "pending" && <div className="w-2 h-2 rounded-full bg-white opacity-50" />}
                                </div>
                            </motion.div>

                            {/* Label */}
                            <motion.span
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: (index * 0.1) + 0.2 }}
                                className={`text-[10px] sm:text-xs mt-3 text-center max-w-[80px] leading-tight transition-all duration-300 ${
                                    status === 'completed' ? 'text-emerald-700 font-semibold' :
                                    status === 'current' ? 'text-blue-700 font-bold translate-y-1' :
                                    status === 'cancelled' ? 'text-red-600 font-bold' :
                                    'text-gray-400 font-medium'
                                }`}
                            >
                                {DEAL_STATUS_LABELS[step]}
                            </motion.span>
                        </div>
                    );
                })}
            </div>

            {/* Terminal status badge */}
            {(isCancelled || isExpired) && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center mt-6"
                >
                    <span
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${
                            isCancelled
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                        {isCancelled ? <AlertCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {isCancelled ? "Deal Cancelled" : "Deal Expired"}
                    </span>
                </motion.div>
            )}
        </div>
    );
}
