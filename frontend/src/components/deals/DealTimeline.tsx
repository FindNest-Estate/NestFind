"use client";

import { DealEvent } from "@/lib/types/deal";
import { DEAL_STATUS_LABELS, DealStatus } from "@/lib/types/deal";
import {
    CheckCircle,
    Circle,
    Clock,
    XCircle,
    Link2,
    MessageSquare,
    Shield,
} from "lucide-react";
import { format } from "date-fns";

interface DealTimelineProps {
    events: DealEvent[];
}

const EVENT_ICONS: Record<string, React.ElementType> = {
    DEAL_CREATED: CheckCircle,
    STATUS_CHANGED: Clock,
    VISIT_LINKED: Link2,
    OFFER_LINKED: Link2,
    RESERVATION_LINKED: Link2,
    TRANSACTION_LINKED: Link2,
    NOTE_ADDED: MessageSquare,
    CANCELLED: XCircle,
    EXPIRED: XCircle,
    ADMIN_OVERRIDE: Shield,
    PRICE_UPDATED: Circle,
};

const EVENT_COLORS: Record<string, string> = {
    DEAL_CREATED: "text-emerald-600 bg-emerald-50 border-emerald-200",
    STATUS_CHANGED: "text-blue-600 bg-blue-50 border-blue-200",
    VISIT_LINKED: "text-purple-600 bg-purple-50 border-purple-200",
    OFFER_LINKED: "text-indigo-600 bg-indigo-50 border-indigo-200",
    RESERVATION_LINKED: "text-cyan-600 bg-cyan-50 border-cyan-200",
    TRANSACTION_LINKED: "text-teal-600 bg-teal-50 border-teal-200",
    NOTE_ADDED: "text-gray-600 bg-gray-50 border-gray-200",
    CANCELLED: "text-red-600 bg-red-50 border-red-200",
    EXPIRED: "text-amber-600 bg-amber-50 border-amber-200",
    ADMIN_OVERRIDE: "text-orange-600 bg-orange-50 border-orange-200",
    PRICE_UPDATED: "text-yellow-600 bg-yellow-50 border-yellow-200",
};

const ROLE_BADGES: Record<string, { bg: string; text: string }> = {
    BUYER: { bg: "bg-blue-100", text: "text-blue-700" },
    SELLER: { bg: "bg-green-100", text: "text-green-700" },
    AGENT: { bg: "bg-purple-100", text: "text-purple-700" },
    ADMIN: { bg: "bg-red-100", text: "text-red-700" },
    SYSTEM: { bg: "bg-gray-100", text: "text-gray-700" },
};

function getEventDescription(event: DealEvent): string {
    if (event.event_type === "DEAL_CREATED") {
        return "Deal was initiated";
    }
    if (event.event_type === "STATUS_CHANGED" && event.from_status && event.to_status) {
        const from = DEAL_STATUS_LABELS[event.from_status as DealStatus] || event.from_status;
        const to = DEAL_STATUS_LABELS[event.to_status as DealStatus] || event.to_status;
        return `${from} → ${to}`;
    }
    if (event.event_type === "CANCELLED") {
        return "Deal was cancelled";
    }
    if (event.event_type === "EXPIRED") {
        return "Deal expired";
    }
    return event.event_type.replace(/_/g, " ").toLowerCase();
}

export function DealTimeline({ events }: DealTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full mb-3 mx-auto bg-gray-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No events recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Timeline events will appear automatically.</p>
            </div>
        );
    }

    return (
        <div className="space-y-0 px-2">
            {events.map((event, index) => {
                const Icon = EVENT_ICONS[event.event_type] || Circle;
                const colors = EVENT_COLORS[event.event_type] || "text-gray-500 bg-gray-50 border-gray-200";
                const roleBadge = ROLE_BADGES[event.actor_role] || ROLE_BADGES.SYSTEM;
                const isLast = index === events.length - 1;

                return (
                    <div key={event.id} className="relative flex gap-4 group">
                        {/* Vertical connector */}
                        {!isLast && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-gray-100 group-hover:bg-blue-100 transition-colors" />
                        )}

                        {/* Icon */}
                        <div
                            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 ${colors} group-hover:scale-110 transition-transform`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-8 ${isLast ? "" : ""}`}>
                            <div className="flex items-start justify-between gap-3 bg-white p-3 rounded-xl border border-transparent group-hover:border-gray-100 group-hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-sm tracking-tight group-hover:text-blue-700 transition-colors">
                                        {getEventDescription(event)}
                                    </p>
                                    {event.notes && (
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100/50">{event.notes}</p>
                                    )}

                                    {/* Actor badge */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${roleBadge.bg} ${roleBadge.text}`}
                                        >
                                            {event.actor_role}
                                        </span>
                                        {event.actor_name && (
                                            <span className="text-xs font-semibold text-gray-500">
                                                {event.actor_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 whitespace-nowrap group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {format(new Date(event.created_at), "MMM d, h:mm a")}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
