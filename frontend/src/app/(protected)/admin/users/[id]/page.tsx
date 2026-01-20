'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, User, Mail, Phone, Calendar, Building, ShoppingCart, Eye,
    CheckCircle, XCircle, AlertCircle, Loader2, Shield, Edit2, RefreshCw,
    Bell, MessageSquare, Key, FileText, Clock, MapPin, Ban, History,
    CreditCard, Home, TrendingUp, MoreHorizontal, ExternalLink
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

interface PageParams {
    id: string;
}

interface UserDetail {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    property_count: number;
    purchase_count: number;
    visit_count: number;
}

interface Property {
    id: string;
    title: string;
    status: string;
    price: number;
    city: string;
    created_at: string;
}

interface Transaction {
    id: string;
    property_title: string;
    total_price: number;
    status: string;
    created_at: string;
}

type Tab = 'overview' | 'properties' | 'transactions' | 'activity';

export default function AdminUserDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [showResetModal, setShowResetModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [notifyMessage, setNotifyMessage] = useState('');
    const [adminNote, setAdminNote] = useState('');

    useEffect(() => {
        loadUser();
    }, [resolvedParams.id]);

    const loadUser = async () => {
        try {
            const response = await get<{ success: boolean; user: UserDetail }>(`/admin/users/${resolvedParams.id}`);
            if (response.success) {
                setUser(response.user);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to load user' });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'suspend' | 'activate' | 'reset_password' | 'notify') => {
        if (!user) return;
        setActionLoading(action);

        try {
            let response;
            if (action === 'suspend') {
                response = await post(`/admin/users/${user.id}/suspend`, {});
            } else if (action === 'activate') {
                response = await post(`/admin/users/${user.id}/activate`, {});
            } else if (action === 'reset_password') {
                // Mock - would send password reset email
                response = { success: true, message: 'Password reset email sent' };
                setShowResetModal(false);
            } else if (action === 'notify') {
                // Mock - would send notification
                response = { success: true, message: 'Notification sent' };
                setShowNotifyModal(false);
                setNotifyMessage('');
            }

            if (response?.success) {
                setMessage({ type: 'success', text: response.message });
                if (action === 'suspend' || action === 'activate') loadUser();
            } else {
                throw new Error(response?.error || 'Action failed');
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Action failed' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const getRoleBadge = (role: string) => {
        const badges: Record<string, { color: string; bg: string }> = {
            'ADMIN': { color: 'text-red-700', bg: 'bg-red-100' },
            'AGENT': { color: 'text-purple-700', bg: 'bg-purple-100' },
            'USER': { color: 'text-slate-700', bg: 'bg-slate-100' }
        };
        return badges[role] || badges['USER'];
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { color: string; bg: string; icon: any }> = {
            'ACTIVE': { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
            'SUSPENDED': { color: 'text-red-700', bg: 'bg-red-100', icon: Ban },
            'PENDING_VERIFICATION': { color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
            'IN_REVIEW': { color: 'text-blue-700', bg: 'bg-blue-100', icon: Eye }
        };
        return badges[status] || { color: 'text-slate-700', bg: 'bg-slate-100', icon: AlertCircle };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-slate-500">User not found</p>
            </div>
        );
    }

    const roleBadge = getRoleBadge(user.role);
    const statusBadge = getStatusBadge(user.status);
    const StatusIcon = statusBadge.icon;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'properties', label: 'Properties', icon: Home, count: user.property_count },
        { id: 'transactions', label: 'Transactions', icon: CreditCard, count: user.purchase_count },
        { id: 'activity', label: 'Activity Log', icon: History }
    ];

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Users
                </button>
                <div className="text-xs text-slate-400 font-mono">
                    ID: {user.id}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border animate-fadeIn ${message.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* User Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header with gradient */}
                <div className="h-24 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                <div className="px-6 pb-6 -mt-12">
                    <div className="flex items-end justify-between">
                        {/* Avatar and Info */}
                        <div className="flex items-end gap-4">
                            <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center">
                                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <span className="text-4xl font-bold text-white">
                                        {user.full_name?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                </div>
                            </div>

                            <div className="pb-2">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl font-bold text-slate-900">{user.full_name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleBadge.bg} ${roleBadge.color}`}>
                                        {user.role}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusIcon className={`w-4 h-4 ${statusBadge.color}`} />
                                    <span className={`text-sm font-medium ${statusBadge.color}`}>{user.status}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-sm text-slate-500">
                                        Joined {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pb-2">
                            <button
                                onClick={() => setShowNotifyModal(true)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Send Notification"
                            >
                                <Bell className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowResetModal(true)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Reset Password"
                            >
                                <Key className="w-5 h-5" />
                            </button>
                            {user.role !== 'ADMIN' && (
                                user.status === 'ACTIVE' ? (
                                    <button
                                        onClick={() => handleAction('suspend')}
                                        disabled={actionLoading !== null}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
                                    >
                                        {actionLoading === 'suspend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                        Suspend
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAction('activate')}
                                        disabled={actionLoading !== null}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
                                    >
                                        {actionLoading === 'activate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Activate
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-t border-slate-200 px-6">
                    <div className="flex gap-1 -mb-px">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${isActive
                                            ? 'border-emerald-500 text-emerald-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Contact Info */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-slate-400" />
                            Contact Information
                        </h2>
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Email Address</p>
                                <p className="font-medium text-slate-900">{user.email}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                                <p className="font-medium text-slate-900">{user.phone || 'Not provided'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Member Since</p>
                                <p className="font-medium text-slate-900">
                                    {user.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Activity Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                            Activity Summary
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Building className="w-5 h-5 text-emerald-600" />
                                    <span className="text-slate-700">Properties Listed</span>
                                </div>
                                <span className="text-2xl font-bold text-emerald-600">{user.property_count}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                                    <span className="text-slate-700">Purchases Made</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-600">{user.purchase_count}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Eye className="w-5 h-5 text-purple-600" />
                                    <span className="text-slate-700">Property Visits</span>
                                </div>
                                <span className="text-2xl font-bold text-purple-600">{user.visit_count}</span>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-400" />
                            Admin Notes
                        </h2>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="Add private notes about this user..."
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                            Save Note
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'properties' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="text-center py-12 text-slate-500">
                        <Building className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="font-medium">User Properties</p>
                        <p className="text-sm mt-1">View all properties listed by this user</p>
                        <p className="text-xs text-slate-400 mt-4">({user.property_count} properties)</p>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="text-center py-12 text-slate-500">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="font-medium">Transaction History</p>
                        <p className="text-sm mt-1">View all transactions by this user</p>
                        <p className="text-xs text-slate-400 mt-4">({user.purchase_count} transactions)</p>
                    </div>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="text-center py-12 text-slate-500">
                        <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="font-medium">Activity Log</p>
                        <p className="text-sm mt-1">Recent actions and audit trail</p>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Password</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            This will send a password reset link to <strong>{user.email}</strong>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction('reset_password')}
                                disabled={actionLoading !== null}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {actionLoading === 'reset_password' ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Notification Modal */}
            {showNotifyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Send Notification</h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Send a message to <strong>{user.full_name}</strong>.
                        </p>
                        <textarea
                            value={notifyMessage}
                            onChange={(e) => setNotifyMessage(e.target.value)}
                            placeholder="Enter your message..."
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNotifyModal(false)}
                                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction('notify')}
                                disabled={actionLoading !== null || !notifyMessage.trim()}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {actionLoading === 'notify' ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
