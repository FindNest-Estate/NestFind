import { Agent } from '@/types/agent';
import { Star, MapPin, Briefcase, ChevronRight, Award, User, Calendar } from 'lucide-react';
import Link from 'next/link';

interface AgentCardProps {
    agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
    // Generate initials for avatar fallback if needed
    const initials = agent.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Calculate completed deals metric
    const completedDeals = agent.completed_transactions || agent.completed_cases || 0;

    return (
        <Link href={`/agents/${agent.id}`} className="group block h-full">
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#FF385C]/10 transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-[#FF385C]/30 flex flex-col h-full transform hover:-translate-y-1">
                
                {/* Profile Header Area */}
                <div className="p-6 pb-5 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF385C]/5 to-transparent rounded-bl-full z-0 transition-opacity group-hover:opacity-100 opacity-50"></div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 overflow-hidden group-hover:border-[#FF385C]/30 transition-colors">
                                <User className="w-8 h-8 text-gray-400 group-hover:text-[#FF385C] transition-colors" />
                            </div>
                            {agent.rating >= 4.5 && (
                                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white p-1 rounded-lg shadow-sm border-2 border-white" title="Top Rated Agent">
                                    <Award className="h-4 w-4" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                            <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-[#FF385C] transition-colors">
                                {agent.name}
                            </h3>
                            
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 bg-[#FF385C]/10 text-[#FF385C] text-xs font-bold px-2 py-0.5 rounded-md">
                                    <Star className="w-3 h-3 fill-[#FF385C]" />
                                    {agent.rating.toFixed(1)}
                                </span>
                                {completedDeals > 20 && (
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate">
                                        Super Agent
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-b border-gray-100 flex-1">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div className="flex flex-col">
                            <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5" /> Deals
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                                {completedDeals} closed
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Joined
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                                {new Date(agent.joined_date).getFullYear()}
                            </div>
                        </div>

                        <div className="flex flex-col col-span-2">
                            <div className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> Service Area
                            </div>
                            <div className="font-semibold text-gray-900 text-sm truncate">
                                Works within <span className="text-[#FF385C]">{agent.service_radius_km} km</span> radius
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-6 py-4 bg-white flex items-center justify-between mt-auto">
                    {agent.distance_km != null ? (
                        <div className="text-sm font-medium text-gray-500">
                            <span className="text-gray-900 font-bold">{agent.distance_km.toFixed(1)} km</span> away
                        </div>
                    ) : (
                        <div className="text-sm font-medium text-gray-400">Verified Pro</div>
                    )}
                    
                    <div className="flex items-center text-sm font-semibold text-[#FF385C] group-hover:gap-1.5 transition-all">
                        View Profile
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
