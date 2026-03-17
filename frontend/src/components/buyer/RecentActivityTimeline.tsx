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
                        <div className={`absolute -left-4 md:relative md:left-0 w-10 h-10 rounded-full border-[3px] shadow-sm bg-white flex items-center justify-center shrink-0 z-10 transition-colors ${markerBg}`}>
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>

                        <div className="flex-1 glass-card bg-white/40 p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="flex justify-between items-start gap-4 relative z-10">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md shadow-sm border border-white/50 ${isVisit ? 'bg-blue-100/50 text-blue-700' : 'bg-purple-100/50 text-purple-700'}`}>
                                            {item.type}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full border border-gray-100">
                                            <Clock className="w-3 h-3 text-gray-300" />
                                            {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : 'Recently'}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-bold text-gray-900 mt-1.5 group-hover:text-indigo-600 transition-colors tracking-tight">
                                        {item.title}
                                    </h4>

                                    <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 font-medium">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{item.location}</span>
                                        </div>
                                        {item.amount && (
                                            <div className="flex items-center gap-1 font-bold text-gray-900 bg-gray-50/50 px-2 py-0.5 rounded border border-gray-100">
                                                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                                                {item.amount.toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {item.image && getImageUrl(item.image) && (
                                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-white/60 shadow-sm relative">
                                        <img src={getImageUrl(item.image)!} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-100/50 flex items-center justify-between relative z-10">
                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-sm w-fit flex items-center gap-1.5 border border-white ${isCompleted ? 'bg-emerald-50 text-emerald-700' : isCancelled ? 'bg-red-50 text-red-700' : 'bg-gray-100/50 text-gray-500'}`}>
                                    Status: {item.status.replace('_', ' ')}
                                </span>

                                <Link
                                    href={isVisit ? `/visits/${item.id}` : `/offers/${item.id}`}
                                    className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 hover:gap-2.5 transition-all bg-indigo-50/50 px-3 py-1.5 rounded-full hover:bg-indigo-100 border border-indigo-100"
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
