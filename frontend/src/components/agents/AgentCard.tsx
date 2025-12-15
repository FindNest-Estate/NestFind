"use client";

import { Star, MapPin, Phone, MessageSquare, User, BadgeCheck, Shield, Award, TrendingUp } from "lucide-react";


interface Agent {
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
    rating?: number;
    review_count?: number;
    experience_years?: number;
    sales_count?: number;
}

interface AgentCardProps {
    agent: Agent;
    isSelected?: boolean;
    onSelect?: () => void;
    onHire?: () => void;
    onMessage?: () => void;
    variant?: "compact" | "full" | "map";
}

export default function AgentCard({
    agent,
    isSelected,
    onSelect,
    onHire,
    onMessage,
    variant = "full"
}: AgentCardProps) {
    // Mock data enhancements if not present in API response
    const rating = agent.rating || 4.9;
    const reviewCount = agent.review_count || 124;
    const experience = agent.experience_years || 8;
    const sales = agent.sales_count || 32;

    if (variant === "compact" || variant === "map") {
        return (
            <div
                onClick={onSelect}
                className={`group relative bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300
                    ${isSelected
                        ? "ring-2 ring-rose-500 shadow-xl shadow-rose-500/10"
                        : "border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200"
                    }
                    ${variant === "map" ? "min-w-[280px]" : ""}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm">
                        {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                <User size={20} />
                            </div>
                        )}
                        {agent.is_available && (
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                            <h3 className="font-bold text-gray-900 text-sm truncate">
                                {agent.first_name} {agent.last_name}
                            </h3>
                            <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-1.5">
                            {agent.agency_name || "Independent Agent"}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                                <Star size={10} className="fill-current" />
                                {rating}
                            </span>
                            <span className="text-[10px] text-gray-400">{reviewCount} reviews</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            className={`group bg-white rounded-3xl p-5 cursor-pointer transition-all duration-300
                ${isSelected
                    ? "ring-2 ring-rose-500 shadow-2xl shadow-rose-900/5 translate-y-[-2px]"
                    : "border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 hover:translate-y-[-2px]"
                }
            `}
        >
            {/* Header Section */}
            <div className="flex items-start justify-between mb-5">
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                            {agent.avatar_url ? (
                                <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                    <User size={28} />
                                </div>
                            )}
                        </div>
                        {agent.is_available && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white flex items-center gap-0.5 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                ONLINE
                            </div>
                        )}
                    </div>

                    {/* Name & Agency */}
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-rose-600 transition-colors">
                                {agent.first_name} {agent.last_name}
                            </h3>
                            <BadgeCheck size={18} className="text-blue-500 fill-blue-50" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-2">
                            {agent.agency_name || "Premier Estate Agent"}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                                <Award size={12} className="text-rose-500" />
                                {experience} Years Exp.
                            </div>
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                                <TrendingUp size={12} className="text-blue-500" />
                                {sales} Sales
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rating Badge */}
                <div className="flex flex-col items-end">
                    <div className="flex items-center justify-center w-10 h-10 bg-yellow-50 rounded-xl mb-1">
                        <span className="font-bold text-yellow-700">{rating}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{reviewCount} reviews</span>
                </div>
            </div>

            {/* Specialties */}
            <div className="mb-5">
                <div className="flex flex-wrap gap-2">
                    {agent.specialty?.split(",").slice(0, 3).map((tag, i) => (
                        <span
                            key={i}
                            className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors hover:border-gray-300 hover:bg-gray-50"
                        >
                            {tag.trim()}
                        </span>
                    )) || (
                            <span className="text-xs text-gray-400 italic">No specialties listed</span>
                        )}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-rose-500">
                        <Shield size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Commission</p>
                        <p className="text-sm font-bold text-gray-900">{agent.commission_rate || "1.5"}%</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-rose-500">
                        <MapPin size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Service Area</p>
                        <p className="text-sm font-bold text-gray-900">{agent.service_radius || 50} km</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-[1fr,auto] gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onHire?.();
                    }}
                    className="h-11 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                    Hire Now
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMessage?.();
                    }}
                    className="h-11 w-11 border border-gray-200 bg-white text-gray-600 rounded-xl hover:border-gray-300 hover:bg-gray-50 active:scale-[0.95] transition-all flex items-center justify-center shadow-sm"
                >
                    <MessageSquare size={20} />
                </button>
            </div>
        </div>
    );
}
