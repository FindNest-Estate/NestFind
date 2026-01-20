'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Phone,
    Mail,
    User,
    LayoutGrid,
    Columns,
    Loader2,
    X
} from 'lucide-react';
import { getAgentCRMLeads, CRMLead } from '@/lib/api/agent';
import LeadPipeline, { PipelineLead, LeadStage, LeadScore } from '@/components/agent/LeadPipeline';
import LeadDetailModal from '@/components/agent/LeadDetailModal';

// Transform CRMLead to PipelineLead
function transformToPipelineLead(lead: CRMLead): PipelineLead {
    // Map old stage format to new
    const stageMap: Record<string, LeadStage> = {
        'New': 'new',
        'Contacted': 'contacted',
        'Qualified': 'qualified',
        'Showing': 'showing',
        'Negotiating': 'negotiating',
        'Closed': 'closed'
    };

    // Calculate score based on activity (simple heuristic)
    const daysSinceContact = Math.floor(
        (Date.now() - new Date(lead.last_contact).getTime()) / (1000 * 60 * 60 * 24)
    );
    let score: LeadScore = 'cold';
    if (daysSinceContact <= 2) score = 'hot';
    else if (daysSinceContact <= 7) score = 'warm';

    return {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        type: lead.type,
        stage: stageMap[lead.stage] || 'new',
        score,
        interest: lead.interest,
        last_contact: lead.last_contact,
        created_at: lead.last_contact, // Using last_contact as proxy
        activity_count: Math.floor(Math.random() * 10) // Mock for now
    };
}

// Simple Card for Grid View
function LeadCard({ lead, onClick }: { lead: PipelineLead; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="bg-white/70 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-rose-200"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${lead.type === 'BUYER' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-rose-500 to-pink-500'
                        }`}>
                        {lead.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{lead.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{lead.type.toLowerCase()} Lead</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
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
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${lead.stage === 'new' ? 'bg-blue-50 text-blue-600' :
                            lead.stage === 'contacted' ? 'bg-amber-50 text-amber-600' :
                                lead.stage === 'closed' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-purple-50 text-purple-600'
                        }`}>
                        {lead.stage}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lead.score === 'hot' ? 'bg-red-50 text-red-500' :
                            lead.score === 'warm' ? 'bg-amber-50 text-amber-500' :
                                'bg-blue-50 text-blue-400'
                        }`}>
                        {lead.score === 'hot' ? '🔥' : lead.score === 'warm' ? '📈' : '❄️'}
                    </span>
                </div>
                <span className="text-xs text-gray-400">
                    {lead.last_contact}
                </span>
            </div>
        </div>
    );
}

// Add Lead Modal
function AddLeadModal({ isOpen, onClose, onAdd }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (lead: Partial<PipelineLead>) => void;
}) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState<'BUYER' | 'SELLER'>('BUYER');
    const [interest, setInterest] = useState('');

    const handleSubmit = () => {
        if (!name || !email) return;
        onAdd({
            name,
            email,
            phone: phone || null,
            type,
            interest: interest || 'General inquiry',
            stage: 'new',
            score: 'warm'
        });
        setName('');
        setEmail('');
        setPhone('');
        setInterest('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Add New Lead</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                            placeholder="+91 98765 43210"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setType('BUYER')}
                                className={`flex-1 py-2 rounded-xl font-medium transition-all ${type === 'BUYER'
                                        ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                Buyer
                            </button>
                            <button
                                onClick={() => setType('SELLER')}
                                className={`flex-1 py-2 rounded-xl font-medium transition-all ${type === 'SELLER'
                                        ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-500'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                Seller
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interest</label>
                        <textarea
                            value={interest}
                            onChange={(e) => setInterest(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                            rows={2}
                            placeholder="Looking for 3BHK in Bangalore..."
                        />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name || !email}
                        className="px-6 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200"
                    >
                        Add Lead
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CRMPage() {
    const [leads, setLeads] = useState<PipelineLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'pipeline' | 'grid'>('pipeline');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'BUYER' | 'SELLER'>('all');

    useEffect(() => {
        async function fetchLeads() {
            try {
                const response = await getAgentCRMLeads();
                if (response.success) {
                    setLeads(response.leads.map(transformToPipelineLead));
                }
            } catch (error) {
                console.error("Failed to fetch leads", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLeads();
    }, []);

    const handleStageChange = (leadId: string, newStage: LeadStage) => {
        setLeads(leads.map(l =>
            l.id === leadId ? { ...l, stage: newStage } : l
        ));
        // TODO: API call to persist stage change
    };

    const handleLeadSave = (updatedLead: PipelineLead) => {
        setLeads(leads.map(l =>
            l.id === updatedLead.id ? updatedLead : l
        ));
        // TODO: API call to persist changes
    };

    const handleAddLead = (newLead: Partial<PipelineLead>) => {
        const lead: PipelineLead = {
            id: `temp-${Date.now()}`,
            name: newLead.name || '',
            email: newLead.email || '',
            phone: newLead.phone || null,
            type: newLead.type || 'BUYER',
            stage: 'new',
            score: 'warm',
            interest: newLead.interest || '',
            last_contact: new Date().toISOString(),
            created_at: new Date().toISOString(),
            activity_count: 0
        };
        setLeads([lead, ...leads]);
        // TODO: API call to create lead
    };

    // Filter leads
    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || lead.type === filterType;
        return matchesSearch && matchesType;
    });

    // Stats
    const stats = {
        total: leads.length,
        hot: leads.filter(l => l.score === 'hot').length,
        new: leads.filter(l => l.stage === 'new').length,
        closed: leads.filter(l => l.stage === 'closed').length
    };

    return (
        <div className="min-h-screen pb-20 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lead Pipeline</h1>
                    <p className="text-gray-500 mt-1">Track and manage your potential clients with AI-powered insights.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setViewMode('pipeline')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="Pipeline View"
                        >
                            <Columns className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-rose-200 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add Lead
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">🔥 Hot Leads</p>
                    <p className="text-2xl font-bold text-red-500">{stats.hot}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">New This Week</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.new}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">Closed Won</p>
                    <p className="text-2xl font-bold text-emerald-500">{stats.closed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search leads by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'BUYER', 'SELLER'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${filterType === type
                                    ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {type === 'all' ? 'All' : type === 'BUYER' ? 'Buyers' : 'Sellers'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                </div>
            ) : viewMode === 'pipeline' ? (
                <LeadPipeline
                    leads={filteredLeads}
                    onLeadClick={setSelectedLead}
                    onStageChange={handleStageChange}
                    onAddLead={() => setIsAddModalOpen(true)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredLeads.map(lead => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => setSelectedLead(lead)}
                        />
                    ))}
                    {filteredLeads.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400">No leads found matching your criteria.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lead Detail Modal */}
            <LeadDetailModal
                lead={selectedLead}
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                onSave={handleLeadSave}
                onAddNote={(leadId, note) => console.log('Add note:', leadId, note)}
            />

            {/* Add Lead Modal */}
            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddLead}
            />
        </div>
    );
}
