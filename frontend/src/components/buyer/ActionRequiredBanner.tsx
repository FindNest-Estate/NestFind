'use client';

import {
    AlertCircle,
    ArrowRight,
    CalendarClock,
    FileSignature,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { ActionRequiredItem } from '@/lib/api/buyer';

interface Props {
    items: ActionRequiredItem[];
}

export default function ActionRequiredBanner({ items }: Props) {
    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-3 mb-6">
            {items.map((item) => {
                // Determine styling based on type
                const isUrgent = item.urgency === 'URGENT';
                const isOffer = item.type === 'offer';

                const bgClass = isUrgent ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
                const iconClass = isUrgent ? 'text-red-600' : 'text-orange-600';
                const buttonClass = isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white';

                const Icon = isOffer ? FileSignature : CalendarClock;

                return (
                    <div
                        key={item.id}
                        className={`flex items-start md:items-center justify-between p-4 rounded-xl border ${bgClass} shadow-sm transition-all hover:shadow-md`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2 bg-white rounded-full shadow-sm ${iconClass}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold flex items-center gap-2 ${iconClass}`}>
                                    {isUrgent && <AlertTriangle className="w-4 h-4" />}
                                    {item.title}
                                </h3>
                                <p className="text-sm text-gray-700 mt-0.5">
                                    {item.message}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 md:mt-0 flex-shrink-0">
                            <Link
                                href={item.link}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${buttonClass}`}
                            >
                                Take Action
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
