"use client";

import AgentCard from "./AgentCard";
import { User, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface AgentListViewProps {
    agents: any[];
    loading?: boolean;
    searchTerm: string;
    onHire?: (agent: any) => void;
}

export default function AgentListView({ agents, loading, searchTerm, onHire }: AgentListViewProps) {
    const router = useRouter();

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-[420px] bg-gray-100 rounded-3xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                    <User className="text-gray-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No agents found</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-8">
                    We couldn't find any agents matching "{searchTerm}". Try adjusting your filters or search for a different location.
                </p>
                <div className="flex gap-2 text-sm text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                    <ShieldCheck size={16} />
                    <span>All our agents are verified professionals</span>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700">
            {agents.map((agent) => (
                <div key={agent.id} className="transition-all hover:z-10">
                    <AgentCard
                        agent={agent}
                        variant="full"
                        onSelect={() => router.push(`/find-agent/${agent.id}`)}
                        onHire={() => onHire ? onHire(agent) : router.push(`/find-agent/${agent.id}`)}
                        onMessage={() => console.log('Message', agent.id)}
                    />
                </div>
            ))}
        </div>
    );
}

