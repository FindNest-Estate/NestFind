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
    average_rating?: number;
    review_count?: number;
    experience_years?: number;
    sales_count?: number;
    clients_count?: number;
    active_listings_count?: number;
    service_areas?: string;
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
    // Real data from backend
    const rating = agent.average_rating || 0;
    const reviewCount = agent.review_count || 0;
    const experience = agent.experience_years || 0;
    const sales = agent.sales_count || 0;

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

    // Mock properties for the portfolio view
    const featuredProperties = [
        { id: 1, image: "https://images.unsplash.com/photo-1600596542815-2a4d9f6fac90?auto=format&fit=crop&w=400&q=80", price: "$4,500/mo", title: "Luxury Loft" },
        { id: 2, image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80", price: "$850k", title: "Modern Home" },
        { id: 3, image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80", price: "$2.1M", title: "Penthouse" },
    ];

    // Check if we should show map placeholder instead (simulating some agents having no properties)
    const showMap = agent.id % 3 === 0;

    return (
        <div
            onClick={onSelect}
            className={`group bg-white rounded-2xl flex flex-col cursor-pointer transition-all duration-300
                ${isSelected
                    ? "ring-2 ring-gray-900 shadow-xl"
                    : "border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1"
                }
            `}
        >
            {/* Header: Identity (Smaller, Clean) */}
            <div className="p-4 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-50 flex-shrink-0 ring-1 ring-gray-100">
                    {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.first_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-bold text-sm">
                            {agent.first_name[0]}{agent.last_name[0]}
                        </div>
                    )}
                    {agent.is_available && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 truncate pr-2">
                            {agent.first_name} {agent.last_name}
                        </h3>
                        <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-xs font-semibold text-gray-900">
                            <Star size={10} className="fill-gray-900" />
                            {rating.toFixed(1)}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{agent.agency_name || "Independent Broker"}</p>
                </div>
            </div>

            {/* Middle: The "Product" (Listings or Map) */}
            <div className="px-4 pb-0">
                {!showMap ? (
                    <div className="grid grid-cols-3 gap-2 h-32">
                        {featuredProperties.map((prop, i) => (
                            <div key={prop.id} className={`relative rounded-lg overflow-hidden bg-gray-100 ${i === 0 ? "col-span-2 row-span-2" : "col-span-1"}`}>
                                <img src={prop.image} alt={prop.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
                                <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white tracking-wide">
                                    {prop.price}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="relative h-32 rounded-xl overflow-hidden bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <MapPin size={24} className="text-blue-400 mb-1" />
                        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] opacity-10 bg-center bg-cover" />
                        <div className="text-center relative z-10">
                            <p className="text-xs font-bold text-blue-900">Service Area</p>
                            <p className="text-[10px] text-blue-600">{agent.service_radius || 50}km Radius</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom: Stats & Action */}
            <div className="p-4 pt-3 mt-1">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3 font-medium">
                    <span className="flex items-center gap-1.5">
                        <BadgeCheck size={14} className="text-blue-500" />
                        Verified
                    </span>
                    <span>{sales} Deals Closed</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                        className="flex-1 h-9 bg-white border border-gray-200 hover:border-gray-900 text-gray-900 text-xs font-bold rounded-lg transition-all"
                    >
                        View Profile
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onMessage?.(); }}
                        className="h-9 w-9 flex items-center justify-center border border-gray-200 hover:border-gray-900 hover:text-gray-900 text-gray-500 rounded-lg transition-colors"
                    >
                        <MessageSquare size={16} />
                    </button>
                </div>
            </div>
        </div >
    );
}
