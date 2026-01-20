'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, DollarSign, Home, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TimelineEvent {
    id: string;
    type: 'visit' | 'offer' | 'reservation' | 'activity';
    title: string;
    subtitle: string;
    date: string;
    time?: string;
    status: string;
    urgent?: boolean;
    link?: string;
}

export default function EventsTimeline() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { get } = await import('@/lib/api');

                // Get visits and offers from buyer dashboard endpoint
                const result = await get<{ success: boolean; recent_activity: any[] }>('/buyer/dashboard');

                if (result.success && result.recent_activity) {
                    const mappedEvents: TimelineEvent[] = result.recent_activity.map((item: any) => ({
                        id: item.id,
                        type: item.type as 'visit' | 'offer',
                        title: item.type === 'visit' ? 'Property Visit' : 'Offer Update',
                        subtitle: item.title,
                        date: item.date,
                        status: item.status,
                        urgent: item.status === 'PENDING' && item.type === 'offer',
                        link: item.type === 'visit' ? '/visits' : '/offers'
                    }));
                    setEvents(mappedEvents);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
                // Keep empty on error - UI will show "No upcoming events"
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'visit': return Calendar;
            case 'offer': return DollarSign;
            case 'reservation': return Home;
            default: return Clock;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'visit': return 'bg-blue-500';
            case 'offer': return 'bg-emerald-500';
            case 'reservation': return 'bg-indigo-500';
            default: return 'bg-gray-500';
        }
    };

    const getDaysUntil = (dateStr: string) => {
        const eventDate = new Date(dateStr);
        const today = new Date();
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return 'Past';
        return `In ${diffDays} days`;
    };

    if (isLoading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Upcoming Events</h3>
                    <p className="text-sm text-gray-500 mt-1">Your schedule at a glance</p>
                </div>
                <Link href="/notifications" className="text-sm font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-sm">No upcoming events</p>
                    <Link href="/properties" className="text-rose-500 text-sm font-medium mt-2 inline-block hover:underline">
                        Browse properties
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event, index) => {
                        const Icon = getEventIcon(event.type);
                        const colorClass = getEventColor(event.type);
                        const daysUntil = getDaysUntil(event.date);

                        return (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={event.link || '#'}
                                    className="block group"
                                >
                                    <div className={`relative p-4 rounded-xl border transition-all ${event.urgent
                                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-300'
                                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
                                        }`}>
                                        {event.urgent && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                                <AlertCircle className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4">
                                            <div className={`${colorClass} p-3 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                        event.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {event.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 truncate">{event.subtitle}</p>
                                                {event.time && (
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {event.time}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-sm font-bold ${daysUntil === 'Today' ? 'text-rose-600' :
                                                    daysUntil === 'Tomorrow' ? 'text-amber-600' :
                                                        'text-gray-900'
                                                    }`}>
                                                    {daysUntil}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Action Button */}
            {events.length > 0 && (
                <Link
                    href="/properties"
                    className="mt-4 block w-full text-center py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    + Schedule New Visit
                </Link>
            )}
        </motion.div>
    );
}
