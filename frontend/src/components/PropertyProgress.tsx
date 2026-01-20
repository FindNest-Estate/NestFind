'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CompletenessLevel } from '@/lib/types/property';

interface PropertyProgressProps {
    percentage: number;
    canHireAgent: boolean;
    level?: CompletenessLevel;
    missingFields?: string[];
}

export default function PropertyProgress({ percentage, canHireAgent, level = 'BASIC', missingFields = [] }: PropertyProgressProps) {
    const getProgressColor = () => {
        if (canHireAgent) return 'bg-[#ff385c]';
        if (percentage >= 70) return 'bg-yellow-500';
        if (percentage >= 40) return 'bg-orange-500';
        return 'bg-gray-400';
    };

    const getProgressText = () => {
        // Use backend-provided level for semantic status
        if (level === 'READY_FOR_AGENT') return 'Ready to hire agent!';
        if (percentage >= 70) return 'Almost there';
        if (percentage >= 40) return 'Good progress';
        return 'Just started';
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Listing Completeness</h3>
                <span className="text-2xl font-bold text-[#ff385c]">{percentage}%</span>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                    className={`absolute left-0 top-0 h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Progress Label */}
            <p className="text-sm text-gray-600 mb-4">{getProgressText()}</p>

            {/* Status Message */}
            {canHireAgent ? (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-[#ff385c] flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-[#ff385c]">
                            Your listing is ready for agent review!
                        </p>
                        <p className="text-xs text-rose-700 mt-1">
                            Click "Hire Agent" below to submit for verification.
                        </p>
                    </div>
                </div>
            ) : missingFields.length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                        Still needed:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                        {missingFields.slice(0, 3).map((field, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                                <span>{field}</span>
                            </li>
                        ))}
                        {missingFields.length > 3 && (
                            <li className="text-gray-500 italic">
                                +{missingFields.length - 3} more...
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
