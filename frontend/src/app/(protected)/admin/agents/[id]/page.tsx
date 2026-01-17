'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Building2,
    Calendar,
    MapPin,
    BadgeCheck,
    History,
    Loader2,
    Phone,
    Mail,
    User
} from 'lucide-react';
import { getAgentDetails, approveAgent, declineAgent, AgentDetail, AgentHistory } from '@/lib/api/admin';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

import dynamic from 'next/dynamic';

const AgentMap = dynamic(() => import('@/components/admin/AgentMap'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 rounded-xl animate-pulse" />
});

import CoveredAreasList from '@/components/admin/CoveredAreasList';

export default function AdminAgentDetailPage({ params }: PageProps) {
    const { id } = React.use(params);
    const router = useRouter();
    const [agent, setAgent] = useState<AgentDetail | null>(null);
    const [history, setHistory] = useState<AgentHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Action state
    const [actionLoading, setActionLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [showDeclineModal, setShowDeclineModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAgentDetails(id);
                if (data.success) {
                    setAgent(data.agent);
                    setHistory(data.history);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load agent details');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleApprove = async () => {
        if (!agent) return;
        if (!confirm(`Confirm approval for ${agent.full_name}?`)) return;

        setActionLoading(true);
        try {
            await approveAgent(agent.id);
            router.push('/admin/agents');
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to approve agent');
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!agent) return;
        setActionLoading(true);
        try {
            await declineAgent(agent.id, reason);
            setShowDeclineModal(false);
            router.push('/admin/agents');
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Failed to decline agent');
            setActionLoading(false);
        }
    };

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;
    if (error || !agent) return <div className="text-red-500 p-8">{error || 'Agent not found'}</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
            </button>

            {/* Header / Actions */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{agent.full_name}</h1>
                    <div className="flex items-center gap-2 mt-2 text-gray-500">
                        <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            {agent.status}
                        </span>
                        <span>•</span>
                        <span>Registered {formatDate(agent.submitted_at)}</span>
                    </div>
                </div>

                {agent.status === 'IN_REVIEW' && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeclineModal(true)}
                            disabled={actionLoading}
                            className="flex items-center px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                        </button>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Col: Contact & Profile */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-gray-500" />
                            Personal Details
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Email</label>
                                    <div className="flex items-center gap-2 text-gray-900 mt-1">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {agent.email}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Phone</label>
                                    <div className="flex items-center gap-2 text-gray-900 mt-1">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {agent.phone_number || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {agent.address && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Address</label>
                                    <div className="flex items-start gap-2 text-gray-900 mt-1">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        {agent.address}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BadgeCheck className="w-5 h-5 mr-2 text-gray-500" />
                            Professional Verification
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <label className="text-xs text-gray-500 uppercase font-semibold">PAN Number</label>
                                <div className="text-lg font-mono font-medium text-gray-900 mt-1">
                                    {agent.profile.pan_number || 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <label className="text-xs text-gray-500 uppercase font-semibold">Aadhaar / UID</label>
                                <div className="text-lg font-mono font-medium text-gray-900 mt-1">
                                    {agent.profile.aadhaar_number || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-semibold">Service Radius</label>
                                <div className="text-gray-900 mt-1">
                                    {agent.profile.service_radius ? `${agent.profile.service_radius} km` : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Section */}
                    {agent.coordinates && agent.profile.service_radius && (
                        <>
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                                    Service Area Map
                                </h2>
                                <AgentMap
                                    lat={agent.coordinates.lat}
                                    lng={agent.coordinates.lng}
                                    radiusKm={agent.profile.service_radius}
                                    agentName={agent.full_name}
                                />
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Building2 className="w-5 h-5 mr-2 text-gray-500" />
                                    Covered Locations
                                </h2>
                                <p className="text-sm text-gray-500 mb-4">
                                    List of cities, towns, and villages within {agent.profile.service_radius}km radius that this agent can cover.
                                </p>
                                <CoveredAreasList
                                    lat={agent.coordinates.lat}
                                    lng={agent.coordinates.lng}
                                    radiusKm={agent.profile.service_radius}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Col: History */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <History className="w-5 h-5 mr-2 text-gray-500" />
                            History
                        </h2>

                        {history.length === 0 ? (
                            <p className="text-gray-500 text-sm">No previous actions recorded.</p>
                        ) : (
                            <div className="space-y-6">
                                {history.map((item, i) => (
                                    <div key={i} className="relative pl-4 border-l-2 border-gray-100">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300" />
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.action.replace('AGENT_', '')}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-1">
                                            {formatDate(item.timestamp)}
                                        </div>
                                        {item.reason && (
                                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                                                "{item.reason}"
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-400 mt-1">
                                            by {item.admin_name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Decline Modal */}
            {showDeclineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Decline Application</h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            Please provide a reason for declining this application. This will be recorded in the history.
                        </p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Reason for rejection..."
                            rows={3}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeclineModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={!reason.trim() || actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
