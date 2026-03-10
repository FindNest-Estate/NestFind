'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Search, UserCheck, CheckCircle, XCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { getPendingAgents, approveAgent, declineAgent, PendingAgent, Pagination } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function AdminAgentsPage() {
    const [agents, setAgents] = useState<PendingAgent[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 0, has_more: false });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<PendingAgent | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState<'approve' | 'decline'>('approve');
    const [actionReason, setActionReason] = useState('');
    const [actioning, setActioning] = useState(false);

    const loadAgents = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getPendingAgents(page);
            // Backend returns PendingAgentsListResponse (no `success` field)
            setAgents(res.agents ?? []);
            setPagination(res.pagination);
        } catch (err: any) {
            setError(err.message || 'Failed to load agents');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadAgents(); }, [loadAgents]);

    const openModal = (agent: PendingAgent, action: 'approve' | 'decline') => {
        setSelectedAgent(agent);
        setModalAction(action);
        setActionReason('');
        setShowModal(true);
    };

    const handleAction = async () => {
        if (!selectedAgent) return;
        setActioning(true);
        try {
            if (modalAction === 'approve') {
                await approveAgent(selectedAgent.id);
            } else {
                await declineAgent(selectedAgent.id, actionReason);
            }
            setSuccessMessage(`Agent ${modalAction === 'approve' ? 'approved' : 'declined'} successfully`);
            setShowModal(false);
            loadAgents(pagination.page);
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            setError(err.message || 'Action failed');
        } finally { setActioning(false); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)]">Agent Approvals</h1>
                    <p className="text-sm text-[var(--gray-500)] mt-0.5">Review and approve pending agent applications</p>
                </div>
                <button onClick={() => loadAgents()} disabled={isLoading}
                    className="p-2 text-[var(--gray-500)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] transition-colors border border-[var(--gray-200)]">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)] bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    <CheckCircle className="w-4 h-4" /> {successMessage}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)] bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)]">
                {isLoading ? (
                    <div className="py-16 text-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-[var(--color-brand)] border-t-transparent mx-auto" />
                        <p className="text-sm text-[var(--gray-400)] mt-3">Loading agents...</p>
                    </div>
                ) : agents.length === 0 ? (
                    <div className="py-16 text-center">
                        <UserCheck className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-900)]">No pending agents</p>
                        <p className="text-xs text-[var(--gray-400)] mt-1">All approvals are up to date</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Agent</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Contact</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">License</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Applied</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--gray-100)]">
                                {agents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-[var(--gray-50)] transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="text-sm font-medium text-[var(--gray-900)]">{agent.full_name}</p>
                                            <p className="text-[11px] text-[var(--gray-500)]">{agent.pan_number ? `PAN: ${agent.pan_number}` : '—'}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <p className="text-xs text-[var(--gray-600)]">{agent.email}</p>
                                            <p className="text-[11px] text-[var(--gray-400)]">{agent.phone_number || '—'}</p>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-600)]">{agent.aadhaar_number || '—'}</td>
                                        <td className="px-5 py-3 text-xs text-[var(--gray-500)]">
                                            {agent.submitted_at ? format(new Date(agent.submitted_at), 'MMM d, yyyy') : '—'}
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={agent.status || 'PENDING'} /></td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openModal(agent, 'approve')}
                                                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[var(--radius-sm)] transition-colors">
                                                    Approve
                                                </button>
                                                <button onClick={() => openModal(agent, 'decline')}
                                                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-[var(--radius-sm)] transition-colors">
                                                    Decline
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="px-5 py-3 border-t border-[var(--gray-100)] flex items-center justify-between text-xs text-[var(--gray-500)]">
                        <span>Page {pagination.page} of {pagination.total_pages} ({pagination.total} agents)</span>
                        <div className="flex gap-1">
                            <button onClick={() => loadAgents(pagination.page - 1)} disabled={pagination.page <= 1}
                                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => loadAgents(pagination.page + 1)} disabled={!pagination.has_more}
                                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)] disabled:opacity-30">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && selectedAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[var(--gray-900)]/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-[var(--card-radius)] p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-[var(--gray-900)] mb-1">
                            {modalAction === 'approve' ? 'Approve' : 'Decline'} Agent
                        </h3>
                        <p className="text-sm text-[var(--gray-500)] mb-4">{selectedAgent.full_name} — {selectedAgent.email}</p>
                        {modalAction === 'decline' && (
                            <div className="mb-4">
                                <label className="block text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wider mb-1">Reason</label>
                                <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                                    placeholder="Reason for declining..." rows={3}
                                    className="w-full px-3 py-2 border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none resize-none focus:border-[var(--color-brand)]" />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-2 text-sm font-medium text-[var(--gray-600)] border border-[var(--gray-200)] rounded-[var(--radius-sm)] hover:bg-[var(--gray-50)]">
                                Cancel
                            </button>
                            <button onClick={handleAction} disabled={actioning || (modalAction === 'decline' && !actionReason.trim())}
                                className={`flex-1 py-2 text-sm font-medium text-white rounded-[var(--radius-sm)] flex items-center justify-center gap-1.5 disabled:opacity-50 ${modalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {actioning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {modalAction === 'approve' ? 'Approve' : 'Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
