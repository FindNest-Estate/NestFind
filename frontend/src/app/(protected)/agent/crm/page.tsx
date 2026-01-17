'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Phone,
    Mail,
    Calendar,
    User,
    ArrowUpRight
} from 'lucide-react';
import { getAgentCRMLeads, CRMLead } from '@/lib/api/agent';

function LeadCard({ lead }: { lead: CRMLead }) {
    return (
        <div className="bg-white/70 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {lead.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{lead.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{lead.type.toLowerCase()} Lead</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{lead.email}</span>
                </div>
                {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{lead.phone}</span>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Interest
                </div>
                <p className="text-sm text-gray-600 truncate">{lead.interest}</p>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${lead.stage === 'New' ? 'bg-blue-50 text-blue-600' :
                        lead.stage === 'Contacted' ? 'bg-amber-50 text-amber-600' :
                            'bg-emerald-50 text-emerald-600'}`}>
                    {lead.stage}
                </span>
                <span className="text-xs text-gray-400">
                    {lead.last_contact}
                </span>
            </div>
        </div>
    );
}

export default function CRMPage() {
    const [leads, setLeads] = useState<CRMLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLeads() {
            try {
                const response = await getAgentCRMLeads();
                if (response.success) {
                    setLeads(response.leads);
                }
            } catch (error) {
                console.error("Failed to fetch leads", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLeads();
    }, []);

    return (
        <div className="min-h-screen pb-20 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
                    <p className="text-gray-500 mt-1">Track and manage your potential clients.</p>
                </div>
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-200 transition-all active:scale-95">
                    <Plus className="w-5 h-5" />
                    Add New Lead
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search leads by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white text-gray-600 font-medium transition-colors shadow-sm">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Kanban / Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                    {leads.length === 0 && (
                        <div className="col-span-full text-center py-20">
                            <p className="text-gray-400">No active leads found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
