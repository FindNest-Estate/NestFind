"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, User, Clock, CheckCircle2, XCircle, ArrowRight, MessageSquare, AlertCircle } from "lucide-react";
import LeadResponseModal from "@/components/dashboard/agent/LeadResponseModal";
import AgentLayout from "@/components/dashboard/AgentLayout";

export default function AgentLeadsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await api.agents.getRequests();
            setRequests(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = (request: any) => {
        setSelectedRequest(request);
        setIsResponseModalOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REQUESTED': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'OFFER_SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <AgentLayout title="Client Leads">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Leads</h1>
                        <p className="text-gray-500 text-sm">View incoming requests and active clients</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 shadow-sm">
                            {requests.filter(r => r.status === 'REQUESTED').length} New
                        </span>
                        <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 shadow-sm">
                            {requests.filter(r => r.status === 'ACTIVE').length} Active
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-gray-300 mb-4" size={40} />
                        <p className="text-gray-400 font-medium">Loading leads...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No leads yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            Your profile is visible to thousands of potential clients. Optimizing your profile can help you get more leads.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Left: Client Info */}
                                    <div className="flex items-start gap-4 min-w-[240px]">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 font-bold text-lg">
                                            {request.client?.first_name?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {request.client?.first_name} {request.client?.last_name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getStatusColor(request.status)}`}>
                                                    {request.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    • {new Date(request.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Request Details */}
                                    <div className="flex-1 border-l border-gray-100 pl-6 border-dashed md:border-solid">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Looking to</span>
                                            <span className="font-bold text-gray-900">{request.service_type}</span>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                            "{request.initial_message}"
                                        </p>

                                        {request.property_preferences && (
                                            <div className="flex flex-wrap gap-2">
                                                {request.property_preferences.budget && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs font-medium text-gray-600">
                                                        <DollarSign size={12} /> {request.property_preferences.budget}
                                                    </span>
                                                )}
                                                {request.property_preferences.locations && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs font-medium text-gray-600">
                                                        <MapPin size={12} /> {request.property_preferences.locations}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex flex-col justify-center items-end min-w-[160px] gap-2">
                                        {request.status === 'REQUESTED' && (
                                            <button
                                                onClick={() => handleRespond(request)}
                                                className="w-full h-10 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                                            >
                                                Respond <ArrowRight size={16} />
                                            </button>
                                        )}

                                        {request.status === 'OFFER_SENT' && (
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Proposal Sent</div>
                                                <div className="text-lg font-bold text-gray-900">{request.commission_rate}% Comm.</div>
                                                <p className="text-[10px] text-gray-400 mt-1">Waiting for client...</p>
                                            </div>
                                        )}

                                        {request.status === 'ACTIVE' && (
                                            <div className="w-full">
                                                <button className="w-full h-10 border border-gray-200 hover:border-gray-300 text-gray-700 bg-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                                    <MessageSquare size={16} /> Chat
                                                </button>
                                                <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600">
                                                    <CheckCircle2 size={12} /> Agreement Active
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <LeadResponseModal
                    isOpen={isResponseModalOpen}
                    onClose={() => setIsResponseModalOpen(false)}
                    request={selectedRequest}
                    onSuccess={fetchRequests}
                />
            </div>
        </AgentLayout>
    );
}

// Helper icons needed for the component
import { DollarSign, MapPin } from "lucide-react";
