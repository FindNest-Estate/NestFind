"use client";

import { Star, MapPin, Phone, MessageSquare, User } from "lucide-react";

interface AgentCardProps {
    agent: {
        id: number;
        first_name: string;
        last_name: string;
        avatar_url?: string;
        agency_name?: string;
        service_radius?: number;
        commission_rate?: number;
        is_available?: boolean;
        specialty?: string;
        phone?: string;
    };
    isSelected?: boolean;
    onSelect?: () => void;
    onHire?: () => void;
    onMessage?: () => void;
    variant?: "compact" | "full";
}

export default function AgentCard({
    agent,
    isSelected,
    onSelect,
    onHire,
    onMessage,
    variant = "full"
}: AgentCardProps) {
    const rating = 4.8; // Mock rating for now

    if (variant === "compact") {
        return (
            <div
                onClick={onSelect}
                className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${isSelected
                    ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                    : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden">
                        {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User size={18} />
                            </div>
                        )}
                        {agent.is_available && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {agent.first_name} {agent.last_name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-0.5">
                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                <span>{rating}</span>
                            </div>
                            <span>•</span>
                            <span>{agent.commission_rate || 2}%</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-lg ${isSelected
                ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-500"
                : "border-gray-100 bg-white hover:border-gray-200"
                }`}
        >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className="relative w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                    {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User size={24} />
                        </div>
                    )}
                    {agent.is_available && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-gray-900 text-base">
                                {agent.first_name} {agent.last_name}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                                {agent.agency_name || "Independent Agent"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-700">{rating}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400" />
                    <span>{agent.service_radius || 50}km service area</span>
                </div>
                <div className="px-2 py-0.5 bg-gray-100 rounded-full font-medium text-gray-700">
                    {agent.commission_rate || 2}% commission
                </div>
            </div>

            {/* Specialty Tags */}
            {agent.specialty && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.specialty.split(",").slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-medium rounded-full">
                            {tag.trim()}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onHire?.();
                    }}
                    className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                    Hire Agent
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMessage?.();
                    }}
                    className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
                >
                    <MessageSquare size={18} />
                </button>
                {agent.phone && (
                    <a
                        href={`tel:${agent.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                        <Phone size={18} />
                    </a>
                )}
            </div>
        </div>
    );
}
