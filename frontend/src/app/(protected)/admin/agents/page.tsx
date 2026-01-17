'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    User,
    Mail,
    Phone,
    Calendar,
    Building2,
    BadgeCheck,
    Clock,
    ChevronLeft,
    ChevronRight,
    RefreshCw
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isApprove ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <IconComponent className={`w-6 h-6 ${isApprove ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-4">{description}</p>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason (optional)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={isApprove ? 'Add approval notes...' : 'Add decline reason...'}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        rows={3}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason || undefined)}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 ${buttonColor} text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
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
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <Link href={`/admin/agents/${agent.id}`} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                        <span className="text-emerald-600 font-bold">
                            {agent.full_name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">{agent.full_name}</div>
                        <div className="text-sm text-gray-500">{agent.email}</div>
                    </div>
                </Link>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-1">
                    {agent.service_radius && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Radius:</span>
                            {agent.service_radius} km
                        </div>
                    )}
                    {agent.pan_number && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <BadgeCheck className="w-4 h-4 text-emerald-500" />
                            <span className="font-mono text-xs text-gray-500">PAN:</span> {agent.pan_number}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                {/* Reusing this column for Aadhaar since Experience is gone */}
                {agent.aadhaar_number ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-mono text-xs text-gray-500">UID:</span> {agent.aadhaar_number}
                    </div>
                ) : (
                    <span className="text-gray-400 italic">Not specified</span>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatDate(agent.submitted_at)}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onApprove}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Approve"
                    >
                        <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onDecline}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Decline"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No pending approvals</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agent Approvals</h1>
                    <p className="text-gray-500">Review and approve agent applications</p>
                </div>
                <button
                    onClick={() => fetchAgents(pagination.page)}
                    disabled={isLoading}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh"
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

            {/* Content */}
            {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="animate-pulse">
                        <div className="h-12 bg-gray-100 border-b border-gray-200" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
                                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : agents.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Identity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
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
                    {pagination.total_pages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="px-4 py-2 text-gray-700">
                                Page {pagination.page} of {pagination.total_pages}
                            </span>

                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={!pagination.has_more}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

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
