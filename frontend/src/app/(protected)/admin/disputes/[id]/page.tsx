'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, CheckCircle, ShieldAlert,
    Calendar, MessageSquare, ArrowUpRight
} from 'lucide-react';
import { getDisputeById, resolveDispute, updateDisputeStatus } from '@/lib/api/disputes';
import { Dispute, DISPUTE_TYPE_LABELS } from '@/lib/types/disputes';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

interface PageParams { id: string; }

export default function AdminDisputeDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [dispute, setDispute] = useState<Dispute | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [resolution, setResolution] = useState('');

    const loadDispute = async () => {
        try {
            const res = await getDisputeById(resolvedParams.id);
            if (res.success) setDispute(res.dispute);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load dispute' });
        } finally { setLoading(false); }
    };

    useEffect(() => { loadDispute(); }, [resolvedParams.id]);

    const handleStatusChange = async (status: string) => {
        if (!dispute) return;
        setActionLoading(status);
        try {
            await updateDisputeStatus(dispute.id, status as any);
            setMessage({ type: 'success', text: `Status updated to ${status}` });
            loadDispute();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleResolve = async () => {
        if (!dispute || !resolution.trim()) return;
        setActionLoading('resolve');
        try {
            await resolveDispute(dispute.id, 'RESOLVED', resolution);
            setMessage({ type: 'success', text: 'Dispute resolved' });
            setResolution('');
            loadDispute();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--color-brand)]" />
        </div>
    );

    if (!dispute) return (
        <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">Dispute not found</p>
        </div>
    );

    return (
        <div className="space-y-5">
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Disputes
            </button>

            {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-5">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 border border-red-100">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 mb-1.5">
                                <h1 className="text-xl font-bold text-[var(--gray-900)]">
                                    {DISPUTE_TYPE_LABELS[dispute.type] || dispute.type}
                                </h1>
                                <StatusBadge status={dispute.status} />
                            </div>
                            <p className="text-sm font-medium text-[var(--gray-600)] leading-relaxed max-w-2xl">{dispute.description}</p>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Dispute Identity</p>
                        <p className="text-[11px] font-mono text-[var(--gray-500)] bg-[var(--gray-50)] px-2 py-0.5 rounded border border-[var(--gray-100)] inline-block">#{dispute.id.slice(0, 12)}</p>
                        <p className="text-[11px] text-[var(--gray-400)] mt-2 font-medium">Deal Reference: {dispute.deal_id?.slice(0, 12)}</p>
                    </div>
                </div>

                {/* Actions */}
                {!['RESOLVED', 'REJECTED'].includes(dispute.status) && (
                    <div className="mt-8 pt-6 border-t border-[var(--gray-100)] flex flex-wrap gap-3">
                        {dispute.status === 'OPEN' && (
                            <button onClick={() => handleStatusChange('UNDER_REVIEW')} disabled={actionLoading === 'UNDER_REVIEW'}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-[var(--radius-sm)] hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                {actionLoading === 'UNDER_REVIEW' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Initiate Case Review
                            </button>
                        )}
                        <button onClick={() => handleStatusChange('REJECTED')} disabled={actionLoading === 'REJECTED'}
                            className="flex items-center gap-2 px-5 py-2 text-red-600 border border-red-200 text-sm font-bold rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors disabled:opacity-50">
                            Dismiss Dispute
                        </button>
                    </div>
                )}
            </div>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Info */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4 uppercase tracking-tight">Incident Information</h2>
                    <div className="space-y-2.5">
                        {[
                            { label: 'Raised By', value: `${dispute.raised_by_name} (${dispute.raised_by_role})` },
                            { label: 'Category', value: DISPUTE_TYPE_LABELS[dispute.type] || dispute.type },
                            { label: 'Current State', value: dispute.status },
                            { label: 'Filed On', value: dispute.created_at ? format(new Date(dispute.created_at), 'MMM d, yyyy HH:mm') : '-' },
                            ...(dispute.resolved_at ? [{ label: 'Closed On', value: format(new Date(dispute.resolved_at), 'MMM d, yyyy HH:mm') }] : []),
                        ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                                <span className="text-[10px] text-[var(--gray-500)] font-bold uppercase tracking-wider">{row.label}</span>
                                <span className="text-sm font-semibold text-[var(--gray-900)]">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Evidence */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4 uppercase tracking-tight">Supporting Evidence</h2>
                    {dispute.evidence_urls && dispute.evidence_urls.length > 0 ? (
                        <div className="grid gap-2">
                            {dispute.evidence_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                    className="flex items-center justify-between p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)] hover:border-[var(--color-brand-subtle)] hover:bg-[var(--color-brand-subtle)] transition-all group">
                                    <div className="flex items-center gap-2.5">
                                        <MessageSquare className="w-4 h-4 text-[var(--gray-400)] group-hover:text-[var(--color-brand)]" />
                                        <span className="text-sm font-semibold text-[var(--gray-700)]">Evidence File #{i + 1}</span>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-[var(--gray-300)] group-hover:text-[var(--color-brand)]" />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)] border-dashed">
                            <p className="text-sm text-[var(--gray-400)] font-medium">No external evidence attached</p>
                        </div>
                    )}

                    {dispute.admin_notes && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-[var(--radius-sm)]">
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1.5">Official Admin Notes</p>
                            <p className="text-sm text-amber-900 leading-relaxed italic">"{dispute.admin_notes}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resolve Form */}
            {!['RESOLVED', 'REJECTED'].includes(dispute.status) && (
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6 shadow-[var(--shadow-sm)]">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4 uppercase tracking-tight">Final Resolution Proposal</h2>
                    <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
                        placeholder="Detail the verdict and any corrective actions taken..."
                        rows={4} className="w-full px-4 py-3 border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--color-brand)] resize-none mb-4" />
                    <button onClick={handleResolve} disabled={!resolution.trim() || actionLoading === 'resolve'}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-[var(--radius-sm)] hover:bg-emerald-700 transition-all disabled:opacity-50">
                        {actionLoading === 'resolve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Finalize & Resolve
                    </button>
                </div>
            )}
        </div>
    );
}
