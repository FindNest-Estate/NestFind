'use client';

import React, { useState } from 'react';
import {
    User,
    Phone,
    Mail,
    Calendar,
    MoreHorizontal,
    Flame,
    TrendingUp,
    Snowflake,
    ChevronRight,
    Plus,
    GripVertical
} from 'lucide-react';

// Lead score types
export type LeadScore = 'hot' | 'warm' | 'cold';
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'showing' | 'negotiating' | 'closed';

export interface PipelineLead {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    type: 'SELLER' | 'BUYER';
    stage: LeadStage;
    score: LeadScore;
    interest: string;
    property_title?: string;
    last_contact: string;
    created_at: string;
    notes?: string;
    activity_count: number;
}

interface LeadPipelineProps {
    leads: PipelineLead[];
    onLeadClick: (lead: PipelineLead) => void;
    onStageChange: (leadId: string, newStage: LeadStage) => void;
    onAddLead: () => void;
}

const STAGES: { value: LeadStage; label: string; color: string }[] = [
    { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
    { value: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
    { value: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
    { value: 'showing', label: 'Showing', color: 'bg-amber-500' },
    { value: 'negotiating', label: 'Negotiating', color: 'bg-orange-500' },
    { value: 'closed', label: 'Closed Won', color: 'bg-emerald-500' },
];

const ScoreBadge = ({ score }: { score: LeadScore }) => {
    const config = {
        hot: { icon: Flame, color: 'text-red-500 bg-red-50', label: 'Hot' },
        warm: { icon: TrendingUp, color: 'text-amber-500 bg-amber-50', label: 'Warm' },
        cold: { icon: Snowflake, color: 'text-blue-400 bg-blue-50', label: 'Cold' },
    };
    const { icon: Icon, color, label } = config[score];
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
};

function LeadCard({ lead, onClick, onDragStart }: {
    lead: PipelineLead;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, lead: PipelineLead) => void;
}) {
    const daysSinceContact = Math.floor(
        (Date.now() - new Date(lead.last_contact).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            onClick={onClick}
            className="group bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-rose-200"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${lead.type === 'BUYER' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-rose-500 to-pink-500'
                        }`}>
                        {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight">{lead.name}</h4>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${lead.type === 'BUYER' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {lead.type}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <ScoreBadge score={lead.score} />
                    <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                </div>
            </div>

            {/* Interest / Property */}
            {lead.property_title && (
                <p className="text-xs text-gray-600 truncate mb-2 bg-gray-50 px-2 py-1 rounded">
                    🏠 {lead.property_title}
                </p>
            )}
            <p className="text-xs text-gray-500 truncate mb-3">{lead.interest}</p>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {daysSinceContact === 0 ? 'Today' : `${daysSinceContact}d ago`}
                    </span>
                    {lead.activity_count > 0 && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            {lead.activity_count} activities
                        </span>
                    )}
                </div>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-rose-400" />
            </div>
        </div>
    );
}

export default function LeadPipeline({ leads, onLeadClick, onStageChange, onAddLead }: LeadPipelineProps) {
    const [draggedLead, setDraggedLead] = useState<PipelineLead | null>(null);
    const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

    const handleDragStart = (e: React.DragEvent, lead: PipelineLead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stage);
    };

    const handleDragLeave = () => {
        setDragOverStage(null);
    };

    const handleDrop = (e: React.DragEvent, stage: LeadStage) => {
        e.preventDefault();
        if (draggedLead && draggedLead.stage !== stage) {
            onStageChange(draggedLead.id, stage);
        }
        setDraggedLead(null);
        setDragOverStage(null);
    };

    const getLeadsByStage = (stage: LeadStage) => {
        return leads.filter(l => l.stage === stage);
    };

    const getTotalValue = (stageLeads: PipelineLead[]) => {
        // Mock calculation - in real app, calculate from lead properties
        return stageLeads.length;
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
            {STAGES.map((stage) => {
                const stageLeads = getLeadsByStage(stage.value);
                const isDragOver = dragOverStage === stage.value;

                return (
                    <div
                        key={stage.value}
                        onDragOver={(e) => handleDragOver(e, stage.value)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage.value)}
                        className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-all ${isDragOver ? 'bg-rose-50 ring-2 ring-rose-300 ring-dashed' : 'bg-gray-50'
                            }`}
                    >
                        {/* Stage Header */}
                        <div className="p-3 border-b border-gray-200 bg-white rounded-t-xl">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                    <h3 className="font-semibold text-gray-900 text-sm">{stage.label}</h3>
                                </div>
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {stageLeads.length}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                                {getTotalValue(stageLeads)} leads
                            </p>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar">
                            {stageLeads.map((lead) => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={() => onLeadClick(lead)}
                                    onDragStart={handleDragStart}
                                />
                            ))}

                            {stageLeads.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                    No leads in this stage
                                </div>
                            )}
                        </div>

                        {/* Add Button for New stage */}
                        {stage.value === 'new' && (
                            <div className="p-2 border-t border-gray-200">
                                <button
                                    onClick={onAddLead}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Lead
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
