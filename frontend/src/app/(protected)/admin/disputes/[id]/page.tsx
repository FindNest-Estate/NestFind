"use client";

import { useState, useEffect, use } from "react";
import { getDisputeById, resolveDispute, assignDispute } from "@/lib/api/disputes";
import { Dispute, DisputeStatus, DisputeDecision } from "@/lib/types/dispute";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

interface PageParams {
    id: string;
}

export default function DisputeResolutionPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [dispute, setDispute] = useState<Dispute | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [decision, setDecision] = useState<DisputeDecision>(DisputeDecision.DISMISSED);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadDispute();
    }, [resolvedParams.id]);

    async function loadDispute() {
        try {
            const data = await getDisputeById(resolvedParams.id);
            setDispute(data.dispute);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }

    const handleAssign = async () => {
        try {
            await assignDispute(resolvedParams.id);
            loadDispute();
        } catch (err) { alert("Failed to assign"); }
    };

    const handleResolve = async () => {
        if (!confirm("Are you sure? This action is final.")) return;
        setIsSubmitting(true);
        try {
            await resolveDispute(resolvedParams.id, decision, notes);
            router.push('/admin/disputes');
        } catch (err) { alert("Failed to resolve"); }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="p-32 text-center">Loading...</div>;
    if (!dispute) return <div>Not found</div>;

    const canResolve = dispute.status === DisputeStatus.UNDER_REVIEW || dispute.status === DisputeStatus.OPEN;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 pt-24">
                <Link href="/admin/disputes" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Disputes
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-xl font-bold text-gray-900">{dispute.title}</h1>
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{dispute.id.slice(0, 8)}</span>
                            </div>

                            <div className="prose max-w-none text-gray-600 bg-gray-50 p-4 rounded-lg">
                                {dispute.description}
                            </div>

                            <div className="mt-6 flex gap-8 text-sm">
                                <div>
                                    <span className="block text-gray-500">Raised By</span>
                                    <span className="font-medium text-gray-900">{dispute.raised_by?.full_name}</span>
                                </div>
                                {dispute.against && (
                                    <div>
                                        <span className="block text-gray-500">Against</span>
                                        <span className="font-medium text-gray-900">{dispute.against.full_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Resolution</h3>

                            {canResolve ? (
                                <div className="space-y-4">
                                    {!dispute.admin_assigned_id && (
                                        <button
                                            onClick={handleAssign}
                                            className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 mb-4"
                                        >
                                            Assign to Me
                                        </button>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                                        <select
                                            value={decision}
                                            onChange={(e) => setDecision(e.target.value as DisputeDecision)}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        >
                                            {Object.values(DisputeDecision).map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                            rows={3}
                                            placeholder="Reason for decision..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleResolve}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                                    >
                                        Resolve Dispute
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-2">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-gray-900">Resolved</p>
                                    <p className="text-sm text-gray-500 mt-1">{dispute.decision}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
