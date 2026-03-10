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
            <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p>No events recorded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {events.map((event, index) => {
                const Icon = EVENT_ICONS[event.event_type] || Circle;
                const colors = EVENT_COLORS[event.event_type] || "text-gray-500 bg-gray-50 border-gray-200";
                const roleBadge = ROLE_BADGES[event.actor_role] || ROLE_BADGES.SYSTEM;
                const isLast = index === events.length - 1;

                return (
                    <div key={event.id} className="relative flex gap-4">
                        {/* Vertical connector */}
                        {!isLast && (
                            <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-gray-200" />
                        )}

                        {/* Icon */}
                        <div
                            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${colors}`}
                        >
                            <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                        {getEventDescription(event)}
                                    </p>
                                    {event.notes && (
                                        <p className="text-sm text-gray-500 mt-0.5">{event.notes}</p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {format(new Date(event.created_at), "MMM d, h:mm a")}
                                </span>
                            </div>

                            {/* Actor badge */}
                            <div className="flex items-center gap-2 mt-1.5">
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${roleBadge.bg} ${roleBadge.text}`}
                                >
                                    {event.actor_role}
                                </span>
                                {event.actor_name && (
                                    <span className="text-xs text-gray-500">
                                        {event.actor_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
