'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Mail,
    Phone,
    Clock,
    User,
    AlertCircle,
    RefreshCw,
    Loader2,
    Plus,
    X,
    MoreVertical,
    Edit2,
    Trash2,
    GripVertical,
    DollarSign,
    Thermometer
} from 'lucide-react';
import {
    getAgentCRMLeads,
    createAgentCRMLead,
    updateAgentCRMLead,
    deleteAgentCRMLead,
    CRMLead
} from '@/lib/api/agent';

/* ──────────────────────────────────────────────────────── */
/*  TYPES & CONSTANTS                                       */
/* ──────────────────────────────────────────────────────── */

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'SHOWING', 'OFFER', 'CLOSED'] as const;
type PipelineStage = typeof PIPELINE_STAGES[number];

const STAGE_LABELS: Record<PipelineStage, string> = {
    NEW: 'New Leads',
    CONTACTED: 'Contacted',
    SHOWING: 'Showing / Active',
    OFFER: 'In Negotiation',
    CLOSED: 'Closed Won/Lost'
};

const STAGE_COLORS: Record<PipelineStage, string> = {
    NEW: 'bg-blue-50 text-blue-700 border-blue-200',
    CONTACTED: 'bg-amber-50 text-amber-700 border-amber-200',
    SHOWING: 'bg-purple-50 text-purple-700 border-purple-200',
    OFFER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const TEMP_COLORS: Record<string, string> = {
    HOT: 'bg-red-50 text-red-700 border-red-200',
    WARM: 'bg-orange-50 text-orange-700 border-orange-200',
    COLD: 'bg-slate-50 text-slate-700 border-slate-200'
};

/* ──────────────────────────────────────────────────────── */
/*  MODAL COMPONENTS                                        */
/* ──────────────────────────────────────────────────────── */

interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (lead: Partial<CRMLead>) => Promise<void>;
    initialData?: CRMLead | null;
}

function LeadModal({ isOpen, onClose, onSave, initialData }: LeadModalProps) {
    const [formData, setFormData] = useState<Partial<CRMLead>>({
        name: '',
        email: '',
        phone: '',
        type: 'BUYER',
        stage: 'NEW',
        temperature: 'WARM',
        notes: '',
        expected_value: undefined
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    type: 'BUYER',
                    stage: 'NEW',
                    temperature: 'WARM',
                    notes: '',
                    expected_value: undefined
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save lead. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--gray-200)] flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <h2 className="text-lg font-bold text-[var(--gray-900)]">
                        {initialData ? 'Edit Lead' : 'Add New Lead'}
                    </h2>
                    <button onClick={onClose} className="p-1 text-[var(--gray-400)] hover:text-[var(--gray-700)] rounded-md hover:bg-[var(--gray-200)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Full Name *</label>
                            <input
                                required
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                disabled={!!(initialData && !initialData.is_explicit)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-500)]"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Email Address *</label>
                            <input
                                required
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                disabled={!!(initialData && !initialData.is_explicit)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-500)]"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                disabled={!!(initialData && !initialData.is_explicit)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-500)]"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Type</label>
                            <select
                                value={formData.type || 'BUYER'}
                                onChange={e => setFormData({ ...formData, type: e.target.value as 'BUYER' | 'SELLER' })}
                                disabled={!!(initialData && !initialData.is_explicit)}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-500)]"
                            >
                                <option value="BUYER">Buyer</option>
                                <option value="SELLER">Seller</option>
                            </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Temperature</label>
                            <select
                                value={formData.temperature || 'WARM'}
                                onChange={e => setFormData({ ...formData, temperature: e.target.value })}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                            >
                                <option value="HOT">Hot (Ready to act)</option>
                                <option value="WARM">Warm (Browsing)</option>
                                <option value="COLD">Cold (Future prospect)</option>
                            </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Pipeline Stage</label>
                            <select
                                value={formData.stage || 'NEW'}
                                onChange={e => setFormData({ ...formData, stage: e.target.value })}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                            >
                                {PIPELINE_STAGES.map(s => (
                                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Expected Value ($)</label>
                            <input
                                type="number"
                                value={formData.expected_value || ''}
                                onChange={e => setFormData({ ...formData, expected_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none"
                                placeholder="e.g. 500000"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1.5">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 text-[13px] border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none resize-none"
                                placeholder="Add any relevant notes about this lead..."
                            />
                        </div>

                        {initialData && !initialData.is_explicit && (
                            <div className="col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2 text-[12px] text-blue-800">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>Some fields cannot be edited because this lead is automatically synced from an active assignment or visit request.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-[var(--gray-200)]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-[13px] font-semibold text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--gray-900)] rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {initialData ? 'Save Changes' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                          */
/* ──────────────────────────────────────────────────────── */

export default function CRMPage() {
    const [leads, setLeads] = useState<CRMLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<CRMLead | null>(null);

    const loadLeads = async () => {
        setLoading(true);
        try {
            const res = await getAgentCRMLeads();
            if (res.success) {
                setLeads(res.leads);
                setError(null);
            } else {
                setError("Failed to load CRM data.");
            }
        } catch (err: any) {
            console.error(err);
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLeads(); }, []);

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
        // Add styling for dragged item
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = async (e: React.DragEvent, targetStage: PipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        const lead = leads.find(l => l.id === leadId);
        if (!lead || lead.stage === targetStage) return;

        // Optimistic UI update
        const previousLeads = [...leads];
        setLeads(leads.map(l => l.id === leadId ? { ...l, stage: targetStage } : l));

        try {
            const res = await updateAgentCRMLead(leadId, { stage: targetStage });
            if (!res.success) throw new Error("Failed to update");
            await loadLeads(); // Optional refresh
        } catch (err) {
            console.error(err);
            setLeads(previousLeads);
            alert("Could not update lead stage.");
        }
    };

    // CRUD Handlers
    const handleSaveLead = async (data: Partial<CRMLead>) => {
        if (editingLead) {
            const res = await updateAgentCRMLead(editingLead.id, data);
            if (res.success) {
                await loadLeads();
            } else {
                throw new Error("Update failed");
            }
        } else {
            const res = await createAgentCRMLead(data);
            if (res.success) {
                await loadLeads();
            } else {
                throw new Error("Creation failed");
            }
        }
    };

    const handleDelete = async (leadId: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            const res = await deleteAgentCRMLead(leadId);
            if (res.success) {
                setLeads(leads.filter(l => l.id !== leadId));
            } else {
                alert("Cannot delete this lead (might not be an explicit lead).");
            }
        } catch (err) {
            alert("Failed to delete lead.");
        }
    };

    const handleEditClick = (lead: CRMLead) => {
        setEditingLead(lead);
        setIsModalOpen(true);
    };

    // Filtering
    const filteredLeads = leads.filter(l => {
        const matchesSearch =
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (l.phone && l.phone.includes(searchQuery));
        return matchesSearch;
    });

    return (
        <div className="max-w-[1600px] mx-auto pb-10 flex flex-col h-[calc(100vh-80px)]">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-[var(--gray-400)]" />
                        CRM Pipeline
                    </h1>
                    <p className="text-[13px] text-[var(--gray-500)] mt-0.5">
                        Manage your leads and track them through the negotiation funnel
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gray-400)]" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-[240px] pl-9 pr-4 py-2 text-[13px] bg-white border border-[var(--gray-200)] rounded-lg focus:ring-1 focus:ring-[var(--gray-900)] focus:border-[var(--gray-900)] outline-none shadow-sm transition-all placeholder:text-[var(--gray-400)]"
                        />
                    </div>
                    <button
                        onClick={loadLeads}
                        disabled={loading}
                        className="flex items-center justify-center w-9 h-9 bg-white border border-[var(--gray-200)] rounded-lg text-[var(--gray-500)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)] transition-colors disabled:opacity-50 shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--gray-900)] text-white text-[13px] font-semibold rounded-lg hover:bg-black transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Lead
                    </button>
                </div>
            </div>

            {/* ── Main Kanban Board ── */}
            <div className="flex-1 flex overflow-x-auto gap-4 pb-4 snap-x relative">
                {loading && leads.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--gray-300)]" />
                    </div>
                ) : error ? (
                    <div className="w-full flex items-center justify-center">
                        <div className="text-center">
                            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-red-600">{error}</p>
                        </div>
                    </div>
                ) : (
                    PIPELINE_STAGES.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.stage === stage || (stage === 'NEW' && !PIPELINE_STAGES.includes(l.stage as any)));

                        return (
                            <div
                                key={stage}
                                className="flex flex-col min-w-[320px] w-[320px] bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-xl shrink-0 snap-start h-full"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage)}
                            >
                                {/* Column Header */}
                                <div className="p-3 border-b border-[var(--gray-200)] flex items-center justify-between rounded-t-xl bg-[var(--gray-100)]">
                                    <div className="flex items-center gap-2">
                                        {/* Color Indicator */}
                                        <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage].split(' ')[0]}`} />
                                        <h3 className="font-bold text-[12px] text-[var(--gray-900)] uppercase tracking-wider">{STAGE_LABELS[stage]}</h3>
                                        <span className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white border border-[var(--gray-200)] text-[var(--gray-600)] text-[10px] font-bold shadow-sm">
                                            {stageLeads.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column Body */}
                                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 min-h-[150px]">
                                    {stageLeads.length === 0 ? (
                                        <div className="h-20 flex items-center justify-center border-2 border-dashed border-[var(--gray-200)] rounded-lg">
                                            <span className="text-[12px] text-[var(--gray-400)] font-medium">Drop leads here</span>
                                        </div>
                                    ) : (
                                        stageLeads.map(lead => (
                                            <div
                                                key={lead.id}
                                                id={`lead-${lead.id}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                                onDragEnd={handleDragEnd}
                                                className="group bg-white border border-[var(--gray-200)] rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
                                            >
                                                {/* Drag Handle & Type */}
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <GripVertical className="w-3.5 h-3.5 text-[var(--gray-300)] group-hover:text-[var(--gray-500)] transition-colors cursor-grab" />
                                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border ${lead.type === 'BUYER' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                                                            {lead.type}
                                                        </span>
                                                        {lead.temperature && (
                                                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider border ${TEMP_COLORS[lead.temperature] || TEMP_COLORS['WARM']}`}>
                                                                {lead.temperature}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(lead)} className="p-1 text-[var(--gray-400)] hover:text-blue-600 rounded bg-[var(--gray-50)] hover:bg-blue-50 transition-colors" title="Edit">
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        {lead.is_explicit && (
                                                            <button onClick={() => handleDelete(lead.id)} className="p-1 text-[var(--gray-400)] hover:text-red-600 rounded bg-[var(--gray-50)] hover:bg-red-50 transition-colors" title="Delete">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <h4 className="text-[13px] font-bold text-[var(--gray-900)] leading-tight mb-1 truncate" title={lead.name}>
                                                    {lead.name}
                                                </h4>

                                                <div className="flex flex-col gap-1.5 mt-2">
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--gray-600)]" title={lead.interest}>
                                                        <Search className="w-3 h-3 text-[var(--gray-400)] shrink-0" />
                                                        <span className="truncate">{lead.interest || 'General Inquiry'}</span>
                                                    </div>
                                                    {lead.expected_value ? (
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                                                            <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            <span>{lead.expected_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-[var(--gray-100)] flex items-center justify-between text-[10px] text-[var(--gray-500)]">
                                                    <div className="flex items-center gap-1 font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{lead.last_contact === 'N/A' ? 'Never' : new Date(lead.last_contact).toLocaleDateString()}</span>
                                                    </div>
                                                    {!lead.is_explicit && (
                                                        <span className="font-bold uppercase tracking-wider text-[var(--gray-400)] bg-[var(--gray-100)] px-1 rounded-sm" title="Auto-imported from properties/visits">Auto</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            <LeadModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
                onSave={handleSaveLead}
                initialData={editingLead}
            />
        </div>
    );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
