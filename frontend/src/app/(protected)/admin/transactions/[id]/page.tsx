'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, CheckCircle, FileText,
    DollarSign, Calendar, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import {
    getAdminTransactionDetail, verifyDocument, approveTransaction,
    AdminTransactionDetail, AdminTransactionDocument
} from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

interface PageParams { id: string; }

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function AdminTransactionDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [txn, setTxn] = useState<AdminTransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadTxn = async () => {
        try {
            const res = await getAdminTransactionDetail(resolvedParams.id);
            if (res.success) setTxn(res.transaction);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load transaction' });
        } finally { setLoading(false); }
    };

    useEffect(() => { loadTxn(); }, [resolvedParams.id]);

    const handleVerifyDoc = async (docId: string, approved: boolean) => {
        setActionLoading(docId);
        try {
            await verifyDocument(docId, approved);
            setMessage({ type: 'success', text: `Document ${approved ? 'verified' : 'rejected'}` });
            loadTxn();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleApprove = async () => {
        if (!txn) return;
        setActionLoading('approve');
        try {
            await approveTransaction(txn.id);
            setMessage({ type: 'success', text: 'Transaction approved' });
            loadTxn();
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

    if (!txn) return (
        <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">Transaction not found</p>
        </div>
    );

    return (
        <div className="space-y-5">
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Transactions
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
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <h1 className="text-xl font-bold text-[var(--gray-900)]">Transaction #{txn.id.slice(0, 8)}</h1>
                            <StatusBadge status={txn.display_status || txn.status} />
                        </div>
                        <p className="text-sm font-medium text-[var(--gray-600)]">
                            {txn.property.title} <span className="text-[var(--gray-400)] mx-1.5">•</span> {txn.property.city}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--color-brand)]">{fmt(txn.total_price)}</p>
                        <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider mt-1">
                            {txn.created_at ? format(new Date(txn.created_at), 'MMM d, yyyy') : ''}
                        </p>
                    </div>
                </div>
                {txn.status !== 'COMPLETED' && (
                    <div className="mt-6 pt-6 border-t border-[var(--gray-100)] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[var(--gray-500)] italic">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Awaiting final administrative verification
                        </div>
                        <button onClick={handleApprove} disabled={actionLoading === 'approve'}
                            className="flex items-center gap-2 px-5 py-2 bg-[var(--color-brand)] text-white text-sm font-bold rounded-[var(--radius-sm)] hover:opacity-90 transition-all disabled:opacity-50">
                            {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Approve Transaction
                        </button>
                    </div>
                )}
            </div>

            {/* Parties & Commission */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4">Transaction Parties</h2>
                    <div className="space-y-2.5">
                        {[
                            { label: 'Buyer', name: txn.buyer.name },
                            { label: 'Seller', name: txn.seller.name },
                            { label: 'Assigned Agent', name: txn.agent.name },
                        ].map((p) => (
                            <div key={p.label} className="flex items-center justify-between p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                                <div>
                                    <span className="text-[10px] text-[var(--gray-500)] font-bold uppercase tracking-wider block mb-0.5">{p.label}</span>
                                    <span className="text-sm font-semibold text-[var(--gray-900)]">{p.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4">Commission Breakdown</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] border border-[var(--color-brand-subtle)]">
                            <span className="text-xs font-bold text-[var(--color-brand)] uppercase tracking-wider">Total Commission</span>
                            <span className="text-lg font-black text-[var(--color-brand)]">{fmt(txn.commission.total)}</span>
                        </div>
                        {[
                            { label: 'Agent Share', value: fmt(txn.commission.agent_share), color: 'text-[var(--gray-700)]' },
                            { label: 'Platform Share', value: fmt(txn.commission.platform_share), color: 'text-indigo-600' },
                        ].map((c) => (
                            <div key={c.label} className="flex items-center justify-between p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                                <span className="text-xs font-medium text-[var(--gray-500)]">{c.label}</span>
                                <span className={`text-sm font-bold ${c.color}`}>{c.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--gray-100)]">
                    <h2 className="text-sm font-bold text-[var(--gray-900)]">Verified Documents ({txn.documents.length})</h2>
                </div>
                {txn.documents.length === 0 ? (
                    <div className="py-12 text-center">
                        <FileText className="w-10 h-10 text-[var(--gray-200)] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[var(--gray-400)]">No legal documents submitted yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--gray-100)]">
                        {txn.documents.map((doc) => (
                            <div key={doc.id} className="px-5 py-4 flex items-center justify-between hover:bg-[var(--gray-50)] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.admin_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--gray-100)] text-[var(--gray-400)]'}`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{doc.file_name}</p>
                                        <p className="text-[11px] text-[var(--gray-500)] mt-0.5">
                                            {doc.document_type} <span className="text-[var(--gray-300)] mx-1">•</span>
                                            Uploaded by {doc.uploader_name} ({doc.uploader_role})
                                            {doc.uploaded_at && ` • ${format(new Date(doc.uploaded_at), 'MMM d')}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                    {doc.admin_verified ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100">
                                            <CheckCircle className="w-3.5 h-3.5" /> VERIFIED
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleVerifyDoc(doc.id, true)} disabled={actionLoading === doc.id}
                                                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50">
                                                {actionLoading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                                            </button>
                                            <button onClick={() => handleVerifyDoc(doc.id, false)} disabled={actionLoading === doc.id}
                                                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50">
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                                        className="p-2 text-[var(--gray-400)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)] rounded-full transition-all">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
