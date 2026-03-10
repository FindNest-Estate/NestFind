'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, MapPin, Calendar, Eye, MessageSquare, DollarSign,
    CheckCircle, AlertCircle, Loader2, Settings
} from 'lucide-react';
import { getAdminPropertyDetail, overridePropertyStatus, AdminPropertyDetail } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

interface PageParams { id: string; }

const STATUS_OPTIONS = [
    'DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'RESERVED', 'SOLD', 'REJECTED', 'ARCHIVED'
];

const fmt = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
};

export default function AdminPropertyDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [property, setProperty] = useState<AdminPropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusReason, setStatusReason] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadProperty = async () => {
        try {
            const response = await getAdminPropertyDetail(resolvedParams.id);
            if (response.success) {
                setProperty(response.property);
                setSelectedStatus(response.property.status);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load property' });
        } finally { setLoading(false); }
    };

    useEffect(() => { loadProperty(); }, [resolvedParams.id]);

    const handleStatusUpdate = async () => {
        if (!property || selectedStatus === property.status) return;
        setUpdating(true);
        try {
            await overridePropertyStatus(property.id, selectedStatus, statusReason || undefined);
            setMessage({ type: 'success', text: 'Status updated successfully' });
            setShowStatusModal(false);
            loadProperty();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update status' });
        } finally {
            setUpdating(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--color-brand)]" />
        </div>
    );

    if (!property) return (
        <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">Property not found</p>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Back */}
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Properties
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
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="mb-2"><StatusBadge status={property.status} /></div>
                        <h1 className="text-xl font-bold text-[var(--gray-900)]">{property.title}</h1>
                        <div className="flex items-center gap-1.5 text-sm text-[var(--gray-500)] mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {property.address}, {property.city}, {property.state} {property.pincode}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--color-brand)]">{fmt(property.price)}</p>
                        <p className="text-xs text-[var(--gray-500)] font-medium">{property.property_type}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--gray-100)] flex gap-2">
                    <button onClick={() => setShowStatusModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gray-900)] text-white text-sm font-medium rounded-[var(--radius-sm)] hover:bg-black transition-colors">
                        <Settings className="w-3.5 h-3.5" /> Change Status
                    </button>
                </div>
            </div>

            {/* Media */}
            {property.media.length > 0 && (
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-3">Property Images</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {property.media.map((m) => (
                            <div key={m.id} className="aspect-video rounded-[var(--radius-sm)] overflow-hidden bg-[var(--gray-50)] border border-[var(--gray-100)]">
                                <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${m.url}`}
                                    alt="Property" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two columns */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Stats */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-3">Activity Metrics</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: Eye, label: 'Visits', value: property.visits },
                            { icon: MessageSquare, label: 'Offers', value: property.offers },
                            { icon: DollarSign, label: 'Transactions', value: property.transactions },
                        ].map((s) => (
                            <div key={s.label} className="text-center p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                                <s.icon className="w-4 h-4 text-[var(--gray-400)] mx-auto mb-1" />
                                <p className="text-xl font-bold text-[var(--gray-900)]">{s.value}</p>
                                <p className="text-[10px] uppercase font-bold text-[var(--gray-500)] tracking-tight">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Parties */}
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                    <h2 className="text-sm font-bold text-[var(--gray-900)] mb-3">Associated Parties</h2>
                    <div className="space-y-3">
                        <div className="p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                            <p className="text-[10px] text-[var(--gray-500)] font-bold uppercase tracking-wider mb-0.5">Seller</p>
                            <p className="text-sm font-semibold text-[var(--gray-900)]">{property.seller.name}</p>
                            <p className="text-xs text-[var(--gray-500)]">{property.seller.email}</p>
                        </div>
                        {property.agent ? (
                            <div className="p-3 bg-[var(--color-brand-subtle)] rounded-[var(--radius-sm)] border border-[var(--color-brand-subtle)]">
                                <p className="text-[10px] text-[var(--color-brand)] font-bold uppercase tracking-wider mb-0.5">Agent</p>
                                <p className="text-sm font-semibold text-[var(--gray-900)]">{property.agent.name}</p>
                                <p className="text-xs text-[var(--gray-500)]">{property.agent.email}</p>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 rounded-[var(--radius-sm)] border border-amber-100">
                                <p className="text-sm font-semibold text-amber-700">No agent assigned</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <h2 className="text-sm font-bold text-[var(--gray-900)] mb-3">Property Specifications</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Bedrooms', value: property.bedrooms || '-' },
                        { label: 'Bathrooms', value: property.bathrooms || '-' },
                        { label: 'Area', value: property.area_sqft ? `${property.area_sqft} sqft` : '-' },
                        { label: 'Type', value: property.property_type },
                    ].map((d) => (
                        <div key={d.label} className="p-3 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
                            <p className="text-[10px] text-[var(--gray-500)] font-bold uppercase tracking-wider">{d.label}</p>
                            <p className="text-base font-bold text-[var(--gray-900)] mt-0.5">{d.value}</p>
                        </div>
                    ))}
                </div>
                {property.description && (
                    <div className="mt-4 pt-4 border-t border-[var(--gray-100)] text-sm text-[var(--gray-600)] leading-relaxed">
                        {property.description}
                    </div>
                )}
            </div>

            {/* Timestamps */}
            <div className="bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-sm)] p-3 flex gap-6 text-[11px] font-medium text-[var(--gray-500)]">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Created: {property.created_at ? format(new Date(property.created_at), 'MMM d, yyyy') : '-'}
                </div>
                {property.verified_at && (
                    <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Verified: {format(new Date(property.verified_at), 'MMM d, yyyy')}
                    </div>
                )}
            </div>

            {/* Status Override Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
                    <div className="relative bg-white p-6 max-w-md w-full shadow-2xl" style={{ borderRadius: 'var(--card-radius)' }}>
                        <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">Change Property Status</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">New Status</label>
                            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 border text-sm outline-none"
                                style={{ borderRadius: 'var(--input-radius, 8px)', borderColor: 'var(--color-border)' }}>
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Reason (optional)</label>
                            <textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)}
                                placeholder="Add a reason..." rows={3}
                                className="w-full px-3 py-2 border text-sm outline-none resize-none"
                                style={{ borderRadius: 'var(--input-radius, 8px)', borderColor: 'var(--color-border)' }} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowStatusModal(false)}
                                className="flex-1 py-2 border text-sm font-medium text-[var(--color-text-secondary)] hover:bg-slate-50"
                                style={{ borderRadius: 'var(--input-radius, 8px)', borderColor: 'var(--color-border)' }}>Cancel</button>
                            <button onClick={handleStatusUpdate} disabled={updating || selectedStatus === property.status}
                                className="flex-1 py-2 bg-[var(--color-brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                style={{ borderRadius: 'var(--input-radius, 8px)' }}>
                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
