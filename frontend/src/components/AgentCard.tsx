import { Agent } from '@/types/agent';
import { Star, MapPin, Briefcase, ChevronRight, Award, Clock } from 'lucide-react';
import Link from 'next/link';

interface AgentCardProps {
    agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
    // Generate initials for avatar
    const initials = agent.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Generate a consistent color based on agent id
    const colors = [
        'from-rose-500 to-pink-600',
        'from-violet-500 to-purple-600',
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
    ];
    const colorIndex = agent.id.charCodeAt(0) % colors.length;
    const gradientColor = colors[colorIndex];

    return (
        <Link href={`/agents/${agent.id}`} className="group block">
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-[#FF385C]/30 group-hover:-translate-y-1">
                {/* Header with gradient background */}
                <div className={`bg-gradient-to-r ${gradientColor} p-6 relative overflow-hidden`}>
                    {/* Decorative circles */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full"></div>
                    <div className="absolute -right-4 top-12 w-16 h-16 bg-white/10 rounded-full"></div>

                    <div className="relative flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold ring-4 ring-white/30">
                            {initials}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:underline decoration-2 underline-offset-2">
                                {agent.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                    <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300 mr-1" />
                                    <span className="text-white text-sm font-semibold">{agent.rating.toFixed(1)}</span>
                                </div>
                                {agent.rating >= 4.5 && (
                                    <div className="flex items-center bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                        <Award className="h-3.5 w-3.5 text-yellow-300 mr-1" />
                                        <span className="text-white text-xs font-medium">Top Rated</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="space-y-3">
                        {/* Service radius */}
                        <div className="flex items-center text-sm text-gray-600">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                <MapPin className="h-4 w-4 text-blue-500" />
                            </div>
                            <span>Serves within <strong>{agent.service_radius_km} km</strong> radius</span>
                        </div>

                        {/* Completed deals */}
                        <div className="flex items-center text-sm text-gray-600">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3">
                                <Briefcase className="h-4 w-4 text-green-500" />
                            </div>
                            <span>
                                <strong>{agent.completed_transactions || agent.completed_cases || 0}</strong> deals completed
                            </span>
                        </div>

                        {/* Member since */}
                        {agent.joined_date && (
                            <div className="flex items-center text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                                    <Clock className="h-4 w-4 text-purple-500" />
                                </div>
                                <span>
                                    Member since {new Date(agent.joined_date).getFullYear()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* CTA Button */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-[#FF385C] font-semibold group-hover:gap-2 transition-all">
                            <span>View Profile</span>
                            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Distance badge */}
                {agent.distance_km != null && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Distance from you</span>
                            <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm">
                                {agent.distance_km.toFixed(1)} km
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}
