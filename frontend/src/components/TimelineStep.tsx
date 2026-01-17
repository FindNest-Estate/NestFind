"use client";

import { CheckCircle, Circle, Clock } from "lucide-react";

interface TimelineStepProps {
    title: string;
    description?: string;
    status: 'completed' | 'current' | 'pending' | 'failed';
    date?: string;
    isLast?: boolean;
}

export function TimelineStep({ title, description, status, date, isLast = false }: TimelineStepProps) {
    return (
        <div className="relative flex gap-4">
            {/* Line */}
            {!isLast && (
                <div
                    className={`absolute left-3 top-8 bottom-0 w-0.5 ${status === 'completed' ? 'bg-emerald-600' : 'bg-gray-200'
                        }`}
                />
            )}

            {/* Icon */}
            <div className={`
                relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-white
                ${status === 'completed' ? 'text-emerald-600' :
                    status === 'current' ? 'text-blue-600 ring-2 ring-blue-100' :
                        status === 'failed' ? 'text-red-600' : 'text-gray-300'}
            `}>
                {status === 'completed' && <CheckCircle className="w-6 h-6 fill-emerald-100" />}
                {status === 'current' && <Clock className="w-5 h-5 animate-pulse" />}
                {status === 'pending' && <Circle className="w-5 h-5" />}
                {status === 'failed' && <Circle className="w-5 h-5 text-red-600" />}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-8 ${isLast ? '' : 'border-b border-gray-50'}`}>
                <div className="flex justify-between items-start">
                    <h4 className={`font-medium ${status === 'current' ? 'text-blue-700' : 'text-gray-900'}`}>
                        {title}
                    </h4>
                    {date && (
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {date}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
            </div>
        </div>
    );
}
