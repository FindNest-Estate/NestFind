'use client';

import React from 'react';
import { Eye, Bookmark, MessageCircle, Calendar, FileText, Clock } from 'lucide-react';

interface ActivityItem {
    type: string;
    title: string;
    timestamp: string;
    icon: string;
    relative_time: string;
    actor?: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    isLoading: boolean;
}

export default function RecentActivity({ activities, isLoading }: RecentActivityProps) {
    if (isLoading) {
        return (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 p-6 h-full">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'view': return Eye;
            case 'save': return Bookmark;
            case 'inquiry': return MessageCircle;
            case 'visit': return Calendar;
            case 'offer': return FileText;
            default: return Clock;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'view': return 'bg-blue-100 text-blue-600';
            case 'save': return 'bg-pink-100 text-pink-600';
            case 'inquiry': return 'bg-purple-100 text-purple-600';
            case 'visit': return 'bg-orange-100 text-orange-600';
            case 'offer': return 'bg-emerald-100 text-emerald-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 p-6 shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Recent Activity
            </h3>

            {activities.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    No recent activity to show.
                </div>
            ) : (
                <div className="relative pl-4 border-l border-gray-200 space-y-8">
                    {activities.map((activity, index) => {
                        const Icon = getIcon(activity.type);
                        const colorClass = getColor(activity.type);

                        return (
                            <div key={index} className="relative group">
                                {/* Timeline Dot with Icon */}
                                <div className={`absolute -left-[29px] top-0 p-1.5 rounded-full border-2 border-white shadow-sm ${colorClass} transition-transform group-hover:scale-110`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>

                                <div className="bg-white/50 p-3 rounded-lg hover:bg-white/80 transition-colors border border-transparent hover:border-gray-100 -mt-2">
                                    <p className="text-sm font-semibold text-gray-800">{activity.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{activity.relative_time}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
