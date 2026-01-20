'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    BadgeCheck,
    MapPin,
    Hash
} from 'lucide-react';
import Link from 'next/link';
import { getPendingAgents, approveAgent, declineAgent, PendingAgent, Pagination } from '@/lib/api/admin';

/**
 * Admin Agent Approval Page - /admin/agents
 * 
 * Lists agents pending approval (IN_REVIEW status).
 * Allows admin to approve or decline.
 */

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

interface ConfirmModalProps {
    isOpen: boolean;
    action: 'approve' | 'decline';
    agent: PendingAgent | null;
    isLoading: boolean;
    onConfirm: (reason?: string) => void;
    onCancel: () => void;
}

function ConfirmModal({ isOpen, action, agent, isLoading, onConfirm, onCancel }: ConfirmModalProps) {
    const [reason, setReason] = useState('');

    if (!isOpen || !agent) return null;

    const isApprove = action === 'approve';
    const title = isApprove ? 'Approve Agent' : 'Decline Agent';
    const description = isApprove
        ? `Are you sure you want to approve ${agent.full_name} as a verified agent?`
        : `Are you sure you want to decline ${agent.full_name}'s application?`;
    const buttonColor = isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700';
    const IconComponent = isApprove ? CheckCircle : XCircle;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl scale-100 transition-transform">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isApprove ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <IconComponent className={`w-6 h-6 ${isApprove ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6">{description}</p>

                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Reason (Optional)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={isApprove ? 'Add approval notes...' : 'Add decline reason...'}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none transition-all"
                        rows={3}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason || undefined)}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 ${buttonColor} text-white rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <IconComponent className="w-5 h-5" />
                                {title}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AgentRow({
    agent,
    onApprove,
    onDecline
}: {
    agent: PendingAgent;
    onApprove: () => void;
    onDecline: () => void;
}) {
    return (
        <tr className="group hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4">
                <Link href={`/admin/agents/${agent.id}`} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-100/50">
                        <span className="text-emerald-700 font-bold">
                            {agent.full_name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{agent.full_name}</div>
                        <div className="text-sm text-slate-500">{agent.email}</div>
                    </div>
                </Link>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-1">
                    {agent.service_radius && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{agent.service_radius} km radius</span>
                        </div>
                    )}
                    {agent.pan_number && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-mono text-xs">PAN: {agent.pan_number}</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                {agent.aadhaar_number ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs">UID: {agent.aadhaar_number}</span>
                    </div>
                ) : (
                    <span className="text-slate-400 text-sm italic">Not specified</span>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(agent.submitted_at)}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onApprove}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-emerald-200"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                    </button>
                    <button
                        onClick={onDecline}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-200"
                    >
                        <XCircle className="w-4 h-4" />
                        Decline
                    </button>
                </div>
            </td>
        </tr>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-20 bg-white">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No pending approvals</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                All agent applications have been reviewed. Check back later for new submissions.
            </p>
        </div>
    );
}

export default function AdminAgentsPage() {
    const [agents, setAgents] = useState<PendingAgent[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
        has_more: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'approve' | 'decline'>('approve');
    const [selectedAgent, setSelectedAgent] = useState<PendingAgent | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchAgents = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await getPendingAgents(page);
            setAgents(response.agents);
            setPagination(response.pagination);
        } catch (err) {
            console.error('Failed to fetch pending agents:', err);
            setError('Failed to load pending agents. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const handleOpenModal = (agent: PendingAgent, action: 'approve' | 'decline') => {
        setSelectedAgent(agent);
        setModalAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (reason?: string) => {
        if (!selectedAgent) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (modalAction === 'approve') {
                await approveAgent(selectedAgent.id, reason);
                setSuccessMessage(`${selectedAgent.full_name} has been approved as an agent.`);
            } else {
                await declineAgent(selectedAgent.id, reason);
                setSuccessMessage(`${selectedAgent.full_name}'s application has been declined.`);
            }

            // Refresh the list
            await fetchAgents(pagination.page);
            setModalOpen(false);

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            console.error('Action failed:', err);
            setError(err?.message || 'Failed to process request. Please try again.');
            setModalOpen(false);
        } finally {
            setIsProcessing(false);
            setSelectedAgent(null);
        }
    };

    const handlePageChange = (newPage: number) => {
        fetchAgents(newPage);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Agent Approvals</h1>
                    <p className="text-slate-500">Review and verify pending agent applications</p>
                </div>
                <button
                    onClick={() => fetchAgents(pagination.page)}
                    disabled={isLoading}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-slate-400 mt-2 text-sm">Loading applications...</p>
                    </div>
                ) : agents.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {agents.map((agent) => (
                                        <AgentRow
                                            key={agent.id}
                                            agent={agent}
                                            onApprove={() => handleOpenModal(agent, 'approve')}
                                            onDecline={() => handleOpenModal(agent, 'decline')}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing <span className="font-medium">{agents.length}</span> applications
                            </p>

                            {pagination.total_pages > 1 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <span className="flex items-center px-4 text-sm text-slate-600 font-medium bg-white border border-slate-200 rounded-lg">
                                        Page {pagination.page} of {pagination.total_pages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.has_more}
                                        className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={modalOpen}
                action={modalAction}
                agent={selectedAgent}
                isLoading={isProcessing}
                onConfirm={handleConfirmAction}
                onCancel={() => {
                    setModalOpen(false);
                    setSelectedAgent(null);
                }}
            />
        </div>
    );
}
