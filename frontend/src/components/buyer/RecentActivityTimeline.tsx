'use client';

import {
    Clock,
    Home,
    FileText,
    ArrowRight,
    MapPin,
    CheckCircle2,
    XCircle,
    Calendar,
    IndianRupee
} from 'lucide-react';
import Link from 'next/link';
import { RecentActivityItem } from '@/lib/api/buyer';
import { formatDistanceToNow } from 'date-fns';
import { getImageUrl } from '@/lib/api';

interface Props {
    items: RecentActivityItem[];
}

export default function RecentActivityTimeline({ items }: Props) {
    if (!items || items.length === 0) {
        return (
            <div className="text-center py-10 bg-[var(--gray-50)] rounded-xl border border-[var(--gray-200)]">
                <Clock className="w-8 h-8 text-[var(--gray-400)] mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-[var(--gray-700)]">No recent activity</h3>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                    Your scheduled tours and offers will appear here.
                </p>
                <Link
                    href="/properties"
                    className="inline-block mt-4 text-sm text-[var(--color-brand)] font-medium hover:underline"
                >
                    Start browsing homes →
                </Link>
            </div>
        );
    }

    return (
        <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--gray-200)] before:to-transparent">
            {items.map((item, index) => {
                const isVisit = item.type === 'visit';
                const isCompleted = item.status === 'COMPLETED' || item.status === 'ACCEPTED';
                const isCancelled = item.status === 'CANCELED' || item.status === 'REJECTED';

                // Timeline marker logic
                let markerBg = 'bg-[var(--gray-100)] border-[var(--gray-300)]';
                let Icon = isVisit ? Home : FileText;
                let iconColor = 'text-[var(--gray-500)]';

                if (isCompleted) {
                    markerBg = 'bg-green-50 border-green-200';
                    iconColor = 'text-green-600';
                    Icon = CheckCircle2;
                } else if (isCancelled) {
                    markerBg = 'bg-red-50 border-red-200';
                    iconColor = 'text-red-500';
                    Icon = XCircle;
                } else if (index === 0) { // Most recent action is highlighted
                    markerBg = 'bg-[var(--color-brand-light)] border-[var(--color-brand)]';
                    iconColor = 'text-[var(--color-brand)]';
                }

                return (
                    <div key={item.id} className="relative flex items-start gap-6 group">
                        {/* Timeline Marker */}
                        <div className={`absolute -left-4 md:relative md:left-0 w-10 h-10 rounded-full border-2 bg-white flex items-center justify-center shrink-0 z-10 transition-colors ${markerBg}`}>
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-white border border-[var(--gray-200)] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${isVisit ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                            {item.type}
                                        </span>
                                        <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : 'Recently'}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-[var(--gray-900)] mt-1 group-hover:text-[var(--color-brand)] transition-colors">
                                        {item.title}
                                    </h4>

                                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--gray-600)]">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {item.location}
                                        </div>
                                        {item.amount && (
                                            <div className="flex items-center gap-1 font-medium text-[var(--gray-900)]">
                                                <IndianRupee className="w-3.5 h-3.5" />
                                                {item.amount.toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {item.image && getImageUrl(item.image) && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--gray-100)] border border-[var(--gray-200)]">
                                        <img src={getImageUrl(item.image)!} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--gray-100)] flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--gray-500)] p-1.5 px-3 bg-[var(--gray-50)] rounded-full">
                                    Status: {item.status.replace('_', ' ')}
                                </span>

                                <Link
                                    href={isVisit ? `/visits/${item.id}` : `/offers/${item.id}`}
                                    className="text-xs font-bold text-[var(--color-brand)] flex items-center gap-1 hover:gap-2 transition-all"
                                >
                                    View Details <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
