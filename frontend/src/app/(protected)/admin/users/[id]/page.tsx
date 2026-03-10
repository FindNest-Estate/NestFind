'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, AlertCircle, CheckCircle, UserX, UserCheck,
    Mail, Phone, Calendar, Building2, DollarSign, Eye, ArrowUpRight, Clock
} from 'lucide-react';
import { getAdminUserDetail, suspendUser, activateUser, AdminUserDetail } from '@/lib/api/admin';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

interface PageParams { id: string; }

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function AdminUserDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [user, setUser] = useState<AdminUserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadUser = async () => {
        try {
            const response = await getAdminUserDetail(resolvedParams.id);
            if (response.success) setUser(response.user);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load user' });
        } finally { setLoading(false); }
    };

    useEffect(() => { loadUser(); }, [resolvedParams.id]);

    const handleSuspend = async () => {
        if (!user) return;
        setActionLoading(true);
        try {
            await suspendUser(user.id);
            setMessage({ type: 'success', text: 'User suspended' });
            loadUser();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to suspend' });
        } finally {
            setActionLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleActivate = async () => {
        if (!user) return;
        setActionLoading(true);
        try {
            await activateUser(user.id);
            setMessage({ type: 'success', text: 'User activated' });
            loadUser();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to activate' });
        } finally {
            setActionLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--color-brand)]" />
        </div>
    );

    if (!user) return (
        <div className="text-center py-20">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">User not found</p>
        </div>
    );

    return (
        <div className="space-y-5">
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Users
            </button>

            {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[var(--color-brand-subtle)] rounded-full flex items-center justify-center border border-[var(--color-brand-subtle)]">
                            <span className="text-[var(--color-brand)] font-bold text-2xl">
                                {user.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[var(--gray-900)]">{user.full_name}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <StatusBadge status={user.role.toUpperCase()} />
                                <StatusBadge status={user.status} />
                            </div>
                        </div>
                    </div>
                    <div>
                        {user.role !== 'admin' && (
                            user.status === 'ACTIVE' ? (
                                <button onClick={handleSuspend} disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-4 py-2 text-red-600 border border-red-200 hover:bg-red-50 text-sm font-semibold rounded-[var(--radius-sm)] transition-colors">
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                    Suspend Account
                                </button>
                            ) : (
                                <button onClick={handleActivate} disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-4 py-2 text-[var(--color-brand)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)] text-sm font-semibold rounded-[var(--radius-sm)] transition-colors">
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                    Activate Account
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-[var(--gray-100)]">
                    <div className="flex items-center gap-2.5 text-sm text-[var(--gray-600)]">
                        <Mail className="w-4 h-4 text-[var(--gray-400)]" />
                        <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                        <div className="flex items-center gap-2.5 text-sm text-[var(--gray-600)]">
                            <Phone className="w-4 h-4 text-[var(--gray-400)]" /> {user.phone}
                        </div>
                    )}
                    <div className="flex items-center gap-2.5 text-sm text-[var(--gray-600)]">
                        <Calendar className="w-4 h-4 text-[var(--gray-400)]" />
                        Joined {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-'}
                    </div>
                    {user.last_login_at && (
                        <div className="flex items-center gap-2.5 text-sm text-[var(--gray-600)]">
                            <Clock className="w-4 h-4 text-[var(--gray-400)]" />
                            Activity: {format(new Date(user.last_login_at), 'MMM d, HH:mm')}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Properties Listed', value: user.property_count, icon: Building2 },
                    { label: 'Transactions Done', value: user.purchase_count, icon: DollarSign },
                    { label: 'Profile Visibility', value: user.visit_count || 0, icon: Eye },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                        <p className="text-[11px] font-bold text-[var(--gray-500)] uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-2xl font-bold text-[var(--gray-900)]">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Properties */}
            {user.properties && user.properties.length > 0 && (
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)]">
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Owned Properties ({user.properties.length})</h2>
                    </div>
                    <div className="divide-y divide-[var(--gray-100)]">
                        {user.properties.map((prop) => (
                            <Link key={prop.id} href={`/admin/properties/${prop.id}`}
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--gray-50)] transition-colors group">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">{prop.title}</p>
                                    <p className="text-xs text-[var(--gray-500)] mt-0.5">{prop.city} • {fmt(prop.price)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={prop.status} />
                                    <ArrowUpRight className="w-4 h-4 text-[var(--gray-300)]" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Transactions */}
            {user.transactions && user.transactions.length > 0 && (
                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--gray-100)]">
                        <h2 className="text-sm font-bold text-[var(--gray-900)]">Transaction History ({user.transactions.length})</h2>
                    </div>
                    <div className="divide-y divide-[var(--gray-100)]">
                        {user.transactions.map((txn) => (
                            <Link key={txn.id} href={`/admin/transactions/${txn.id}`}
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--gray-50)] transition-colors group">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--gray-900)] group-hover:text-[var(--color-brand)]">{txn.property_title}</p>
                                    <p className="text-xs text-[var(--gray-500)] mt-0.5">{fmt(txn.total_price)} • {txn.created_at ? format(new Date(txn.created_at), 'MMM d, yyyy') : '-'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={txn.status} />
                                    <ArrowUpRight className="w-4 h-4 text-[var(--gray-300)]" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
