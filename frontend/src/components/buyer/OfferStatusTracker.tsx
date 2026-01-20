'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface StatusStep {
    label: string;
    status: 'complete' | 'current' | 'pending' | 'skipped';
    timestamp?: string;
    description?: string;
}

interface OfferStatusTrackerProps {
    currentStatus: 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
    submittedAt: string;
    respondedAt?: string;
}

export default function OfferStatusTracker({ currentStatus, submittedAt, respondedAt }: OfferStatusTrackerProps) {
    const getSteps = (): StatusStep[] => {
        const baseSteps: StatusStep[] = [
            {
                label: 'Offer Submitted',
                status: 'complete',
                timestamp: submittedAt,
                description: 'Your offer has been sent to the seller'
            },
            {
                label: 'Under Review',
                status: currentStatus === 'PENDING' ? 'current' : 'complete',
                timestamp: submittedAt,
                description: 'Seller is reviewing your offer'
            }
        ];

        if (currentStatus === 'ACCEPTED') {
            return [
                ...baseSteps,
                {
                    label: 'Offer Accepted',
                    status: 'complete',
                    timestamp: respondedAt,
                    description: 'Congratulations! Seller accepted your offer'
                },
                {
                    label: 'Next: Escrow',
                    status: 'current',
                    description: 'Proceed to escrow and closing process'
                }
            ];
        }

        if (currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN') {
            return [
                ...baseSteps,
                {
                    label: currentStatus === 'REJECTED' ? 'Offer Rejected' : 'Offer Withdrawn',
                    status: 'complete',
                    timestamp: respondedAt,
                    description: currentStatus === 'REJECTED'
                        ? 'Seller declined your offer'
                        : 'You withdrew this offer'
                }
            ];
        }

        if (currentStatus === 'COUNTERED') {
            return [
                ...baseSteps,
                {
                    label: 'Counter Offer Received',
                    status: 'complete',
                    timestamp: respondedAt,
                    description: 'Seller sent a counter offer'
                },
                {
                    label: 'Your Response',
                    status: 'current',
                    description: 'Review and respond to counter offer'
                }
            ];
        }

        // PENDING - default
        return [
            ...baseSteps,
            {
                label: 'Awaiting Response',
                status: 'pending',
                description: 'Waiting for seller decision'
            }
        ];
    };

    const steps = getSteps();

    const formatDate = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="glass-card p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Offer Status</h3>

            <div className="space-y-6">
                {steps.map((step, index) => {
                    const isComplete = step.status === 'complete';
                    const isCurrent = step.status === 'current';
                    const isPending = step.status === 'pending';
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={index} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div className={`absolute left-5 top-12 bottom-0 w-0.5 ${isComplete ? 'bg-emerald-500' :
                                        isCurrent ? 'bg-gradient-to-b from-blue-500 to-transparent' :
                                            'bg-gray-200'
                                    }`} />
                            )}

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15 }}
                                className="flex gap-4"
                            >
                                {/* Icon */}
                                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-emerald-500 ring-4 ring-emerald-100' :
                                        isCurrent ? 'bg-blue-500 ring-4 ring-blue-100 animate-pulse' :
                                            'bg-gray-200 ring-4 ring-gray-50'
                                    }`}>
                                    {isComplete ? (
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    ) : isCurrent ? (
                                        <Clock className="w-5 h-5 text-white" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-6">
                                    <div className="flex items-start justify-between mb-1">
                                        <h4 className={`font-bold text-lg ${isComplete ? 'text-emerald-700' :
                                                isCurrent ? 'text-blue-700' :
                                                    'text-gray-500'
                                            }`}>
                                            {step.label}
                                        </h4>
                                        {step.timestamp && (
                                            <span className="text-xs text-gray-500 font-medium">
                                                {formatDate(step.timestamp)}
                                            </span>
                                        )}
                                    </div>
                                    {step.description && (
                                        <p className={`text-sm ${isComplete || isCurrent ? 'text-gray-700' : 'text-gray-500'
                                            }`}>
                                            {step.description}
                                        </p>
                                    )}

                                    {/* Action button for current step */}
                                    {isCurrent && currentStatus === 'COUNTERED' && (
                                        <button className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                            Review Counter Offer
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {/* Summary Card */}
            <div className={`mt-6 p-4 rounded-xl border-2 ${currentStatus === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200' :
                    currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN' ? 'bg-red-50 border-red-200' :
                        currentStatus === 'COUNTERED' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-start gap-3">
                    {currentStatus === 'ACCEPTED' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN' ? (
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    ) : (
                        <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    )}
                    <div>
                        <p className={`font-semibold mb-1 ${currentStatus === 'ACCEPTED' ? 'text-emerald-900' :
                                currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN' ? 'text-red-900' :
                                    currentStatus === 'COUNTERED' ? 'text-amber-900' :
                                        'text-blue-900'
                            }`}>
                            {currentStatus === 'ACCEPTED' && 'Offer Accepted! 🎉'}
                            {currentStatus === 'REJECTED' && 'Offer Not Accepted'}
                            {currentStatus === 'WITHDRAWN' && 'Offer Withdrawn'}
                            {currentStatus === 'COUNTERED' && 'Action Required'}
                            {currentStatus === 'PENDING' && 'In Progress'}
                        </p>
                        <p className={`text-sm ${currentStatus === 'ACCEPTED' ? 'text-emerald-700' :
                                currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN' ? 'text-red-700' :
                                    currentStatus === 'COUNTERED' ? 'text-amber-700' :
                                        'text-blue-700'
                            }`}>
                            {currentStatus === 'ACCEPTED' && 'The seller has accepted your offer. Proceed to escrow.'}
                            {currentStatus === 'REJECTED' && 'Consider submitting a new offer or browsing other properties.'}
                            {currentStatus === 'WITHDRAWN' && 'You can submit a new offer anytime.'}
                            {currentStatus === 'COUNTERED' && 'The seller sent a counter offer. Review and respond soon.'}
                            {currentStatus === 'PENDING' && 'Your offer is being reviewed. You\'ll be notified of any updates.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
