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
        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
                    Upcoming Tours
                </h2>
                <Link href="/visits" className="text-sm font-medium text-[var(--color-brand)] hover:underline flex items-center">
                    View Schedule <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-3">
                {visits.map(visit => {
                    const dateObj = new Date(visit.preferred_date);
                    return (
                        <div key={visit.id} className="flex gap-4 p-3 rounded-xl border border-[var(--gray-200)] hover:border-[var(--gray-300)] transition-colors bg-white group">
                            {/* Date Badge */}
                            <div className="flex-shrink-0 w-14 h-14 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg flex flex-col items-center justify-center text-[var(--color-brand)]">
                                <span className="text-xs font-bold uppercase">{format(dateObj, 'MMM')}</span>
                                <span className="text-lg font-black leading-none">{format(dateObj, 'dd')}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <Link href={`/visits/${visit.id}`}>
                                    <h3 className="font-bold text-sm text-[var(--gray-900)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                        {visit.property_title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--gray-600)] font-medium">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(dateObj, 'h:mm a')}
                                    </div>
                                    <div className="flex items-center gap-1 truncate">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span className="truncate">{visit.property_city}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Options Button */}
                            <div className="flex-shrink-0 flex items-center justify-center px-2">
                                <Link
                                    href={`/visits/${visit.id}`}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--gray-50)] text-[var(--gray-700)] hover:bg-[var(--gray-100)] transition-colors border border-[var(--gray-200)]">
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
