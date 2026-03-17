'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, Clock } from 'lucide-react';
import { getUpcomingVisits, UpcomingVisit } from '@/lib/api/buyer';
import { getImageUrl } from '@/lib/api';
import { format } from 'date-fns';

export default function UpcomingVisitsWidget() {
    const [visits, setVisits] = useState<UpcomingVisit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                const data = await getUpcomingVisits();
                // Optional: API returns all approved, UI only shows the next 4
                setVisits(data.slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch upcoming visits", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 animate-pulse">
                <div className="h-5 w-40 bg-[var(--gray-200)] rounded mb-5"></div>
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-20 bg-[var(--gray-100)] rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (visits.length === 0) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
                        Upcoming Tours
                    </h2>
                </div>
                <div className="text-center py-6 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-dashed border-[var(--gray-200)]">
                    <Calendar className="w-8 h-8 text-[var(--gray-300)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--gray-900)]">No upcoming tours</p>
                    <p className="text-xs text-[var(--gray-500)] mt-1 mb-4">Start exploring properties to book a visit.</p>
                    <Link href="/properties" className="inline-block px-4 py-2 bg-white border border-[var(--gray-200)] rounded-full text-xs font-semibold hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors">
                        Browse Properties
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card border border-white/60 p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-transparent opacity-50" />
            <div className="flex justify-between items-center mb-6 relative">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Upcoming Tours
                </h2>
                <Link href="/visits" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center transition-colors">
                    View Schedule <ChevronRight className="w-4 h-4 ml-0.5" />
                </Link>
            </div>

            <div className="space-y-4 relative z-10">
                {visits.map(visit => {
                    const dateObj = new Date(visit.preferred_date);
                    return (
                        <div key={visit.id} className="flex gap-4 p-4 rounded-2xl border border-white/60 bg-white/40 hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                            {/* Date Badge */}
                            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-b from-emerald-50 to-white border border-emerald-100 rounded-xl flex flex-col items-center justify-center text-emerald-600 shadow-sm group-hover:border-emerald-200 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest">{format(dateObj, 'MMM')}</span>
                                <span className="text-xl font-black leading-none mt-0.5 text-emerald-700">{format(dateObj, 'dd')}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <Link href={`/visits/${visit.id}`}>
                                    <h3 className="font-bold text-[15px] text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                                        {visit.property_title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 font-medium">
                                    <div className="flex items-center gap-1.5 bg-gray-50/80 px-2 py-0.5 rounded text-gray-600 border border-gray-100">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        {format(dateObj, 'h:mm a')}
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{visit.property_city}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Options Button */}
                            <div className="flex-shrink-0 flex items-center justify-center pl-2">
                                <Link
                                    href={`/visits/${visit.id}`}
                                    className="text-xs font-bold px-4 py-2 rounded-xl bg-white text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all">
                                    Manage
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
