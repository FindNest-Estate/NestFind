'use client';

import React, { useState } from 'react';
import { X, User, Mail, Phone, Home, MessageSquare, Save, Calendar, Tag } from 'lucide-react';
import { PipelineLead, LeadScore, LeadStage } from './LeadPipeline';

interface LeadDetailModalProps {
    lead: PipelineLead | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (lead: PipelineLead) => void;
    onAddNote: (leadId: string, note: string) => void;
}

const SCORE_OPTIONS: { value: LeadScore; label: string; color: string }[] = [
    { value: 'hot', label: '🔥 Hot', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'warm', label: '📈 Warm', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'cold', label: '❄️ Cold', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
    { value: 'new', label: 'New Lead' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'showing', label: 'Showing' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'closed', label: 'Closed Won' },
];

// Mock activity timeline
const mockActivities = [
    { id: '1', type: 'note', content: 'Initial inquiry about 3BHK properties', timestamp: '2 hours ago' },
    { id: '2', type: 'call', content: 'Discussed budget and preferences', timestamp: '1 day ago' },
    { id: '3', type: 'email', content: 'Sent property recommendations', timestamp: '3 days ago' },
];

export default function LeadDetailModal({ lead, isOpen, onClose, onSave, onAddNote }: LeadDetailModalProps) {
    const [editedLead, setEditedLead] = useState<PipelineLead | null>(null);
    const [newNote, setNewNote] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

    React.useEffect(() => {
        if (lead) {
            setEditedLead({ ...lead });
        }
    }, [lead]);

    if (!isOpen || !lead || !editedLead) return null;

    const handleSave = () => {
        if (editedLead) {
            onSave(editedLead);
            onClose();
        }
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            onAddNote(lead.id, newNote);
            setNewNote('');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-2xl font-bold">
                            {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{lead.name}</h2>
                            <p className="text-white/80 text-sm">{lead.type} Lead • Added {formatDate(lead.created_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'details'
                                ? 'text-rose-600 border-b-2 border-rose-500'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'activity'
                                ? 'text-rose-600 border-b-2 border-rose-500'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Activity Timeline
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Mail className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-400">Email</p>
                                        <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Phone className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-400">Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{lead.phone || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Interest */}
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Home className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-500">Interest</span>
                                </div>
                                <p className="text-sm text-gray-700">{lead.interest}</p>
                                {lead.property_title && (
                                    <p className="text-sm text-rose-600 font-medium mt-2">🏠 {lead.property_title}</p>
                                )}
                            </div>

                            {/* Lead Score */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Tag className="w-4 h-4" />
                                    Lead Score
                                </label>
                                <div className="flex gap-2">
                                    {SCORE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setEditedLead({ ...editedLead, score: opt.value })}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${editedLead.score === opt.value
                                                    ? `${opt.color} ring-2 ring-offset-1`
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stage */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4" />
                                    Pipeline Stage
                                </label>
                                <select
                                    value={editedLead.stage}
                                    onChange={(e) => setEditedLead({ ...editedLead, stage: e.target.value as LeadStage })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm"
                                >
                                    {STAGE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors">
                                    <Phone className="w-4 h-4" />
                                    Call
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-600 rounded-xl font-medium hover:bg-purple-100 transition-colors">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium hover:bg-emerald-100 transition-colors">
                                    <Calendar className="w-4 h-4" />
                                    Schedule
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Add Note */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Timeline */}
                            <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                                {mockActivities.map((activity) => (
                                    <div key={activity.id} className="relative">
                                        <div className="absolute -left-[25px] w-4 h-4 bg-white border-2 border-gray-300 rounded-full" />
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-sm text-gray-700">{activity.content}</p>
                                            <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors flex items-center gap-2 shadow-lg shadow-rose-200"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
