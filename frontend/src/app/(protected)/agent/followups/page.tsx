'use client';

import React, { useState, useEffect } from 'react';
import { getFollowupDashboard } from '@/lib/api/visits';
import { FollowupDashboardResponse } from '@/lib/types/visit';
import { Loader2, AlertCircle, MessageSquare, ClipboardEdit, Flame, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function FollowUpsDashboard() {
    const router = useRouter();
    const [data, setData] = useState<FollowupDashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'PRIORITY' | 'PENDING' | 'HOT'>('PRIORITY');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getFollowupDashboard();
            if (res.success) {
                setData(res);
            } else {
                setError(res.error || 'Failed to load follow-ups dashboard');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                    <h3 className="font-bold">Error loading dashboard</h3>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    const summary = data?.summary || { follow_up_count: 0, pending_feedback_count: 0, hot_leads_count: 0 };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Follow-Ups Hub</h1>
                    <p className="text-gray-500 mt-1">Manage post-visit engagement and close more deals.</p>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    onClick={() => setActiveTab('PRIORITY')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'PRIORITY' ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-white border-gray-100 hover:border-indigo-100 shadow-sm'}`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'PRIORITY' ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
                            <MessageSquare className={`w-5 h-5 ${activeTab === 'PRIORITY' ? 'text-white' : 'text-indigo-600'}`} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{summary.follow_up_count}</span>
                    </div>
                    <div className="font-semibold text-gray-900">Priority Follow-Ups</div>
                    <div className="text-sm text-gray-500">Flagged by you from visit notes</div>
                </div>

                <div
                    onClick={() => setActiveTab('HOT')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'HOT' ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20' : 'bg-white border-gray-100 hover:border-orange-100 shadow-sm'}`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'HOT' ? 'bg-orange-500' : 'bg-orange-100'}`}>
                            <Flame className={`w-5 h-5 ${activeTab === 'HOT' ? 'text-white' : 'text-orange-500'}`} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{summary.hot_leads_count}</span>
                    </div>
                    <div className="font-semibold text-gray-900">Hot Leads</div>
                    <div className="text-sm text-gray-500">High interest, no active offer</div>
                </div>

                <div
                    onClick={() => setActiveTab('PENDING')}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'PENDING' ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-emerald-100 shadow-sm'}`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'PENDING' ? 'bg-emerald-600' : 'bg-emerald-100'}`}>
                            <ClipboardEdit className={`w-5 h-5 ${activeTab === 'PENDING' ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{summary.pending_feedback_count}</span>
                    </div>
                    <div className="font-semibold text-gray-900">Pending Feedback</div>
                    <div className="text-sm text-gray-500">Completed visits needing your notes</div>
                </div>
            </div>

            {/* List Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex items-center gap-2">
                    {activeTab === 'PRIORITY' && <><MessageSquare className="w-4 h-4 text-indigo-600" /> Needs Contact</>}
                    {activeTab === 'HOT' && <><Flame className="w-4 h-4 text-orange-500" /> Ready for Offer</>}
                    {activeTab === 'PENDING' && <><ClipboardEdit className="w-4 h-4 text-emerald-600" /> Action Required</>}
                </div>

                <div className="divide-y divide-gray-100">
                    {activeTab === 'PRIORITY' && (!data?.follow_up_required || data.follow_up_required.length === 0) && (
                        <div className="p-8 text-center text-gray-500">No priority follow-ups flagged right now.</div>
                    )}
                    {activeTab === 'PRIORITY' && data?.follow_up_required?.map(visit => (
                        <div key={visit.visit_id} className="p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors">
                            <div>
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    {visit.property_title}
                                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                                        Action: {visit.recommended_action || 'N/A'}
                                    </span>
                                </h4>
                                <div className="text-sm text-gray-500 mt-1">
                                    Buyer: <span className="font-semibold text-gray-700">{visit.buyer_name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Flagged on {visit.feedback_at ? format(new Date(visit.feedback_at), 'MMM d, yyyy') : 'Unknown'}
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/agent/visits/${visit.visit_id}`)}
                                className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                            >
                                Open Visit <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {activeTab === 'HOT' && (!data?.hot_leads || data.hot_leads.length === 0) && (
                        <div className="p-8 text-center text-gray-500">No hot leads detected at the moment.</div>
                    )}
                    {activeTab === 'HOT' && data?.hot_leads?.map(visit => (
                        <div key={visit.visit_id} className="p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors">
                            <div>
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    {visit.property_title}
                                </h4>
                                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                    <span>Buyer: <span className="font-semibold text-gray-700">{visit.buyer_name}</span></span>
                                    <span>Price: <span className="font-medium text-emerald-700">${visit.property_price?.toLocaleString() || 'N/A'}</span></span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {visit.agent_interest_score && visit.agent_interest_score >= 4 && (
                                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Agent Rating: High</span>
                                    )}
                                    {visit.buyer_interest === 'HIGH' && (
                                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Buyer Interest: High</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/agent/visits/${visit.visit_id}`)}
                                className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                            >
                                Review Lead <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {activeTab === 'PENDING' && (!data?.pending_feedback || data.pending_feedback.length === 0) && (
                        <div className="p-8 text-center text-gray-500">All caught up on visit feedback!</div>
                    )}
                    {activeTab === 'PENDING' && data?.pending_feedback?.map(visit => (
                        <div key={visit.visit_id} className="p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors">
                            <div>
                                <h4 className="font-bold text-gray-900">
                                    {visit.property_title}
                                </h4>
                                <div className="text-sm text-gray-500 mt-1">
                                    Buyer: <span className="font-semibold text-gray-700">{visit.buyer_name}</span>
                                </div>
                                <div className="text-xs text-orange-600 mt-1 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Completed {visit.completed_at ? format(new Date(visit.completed_at), 'MMM d, h:mm a') : 'Recently'}
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/agent/visits/${visit.visit_id}`)}
                                className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                            >
                                Submit Notes
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
