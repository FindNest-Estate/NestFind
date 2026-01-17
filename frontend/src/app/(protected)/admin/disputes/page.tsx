"use client";

import { useState, useEffect } from "react";
import { getDisputes } from "@/lib/api/disputes";
import { Dispute, DisputeStatus } from "@/lib/types/dispute";
import { Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getDisputes().then(data => setDisputes(data.disputes)).finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 pt-24">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Dispute Management</h1>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-medium text-gray-600">ID</th>
                                <th className="p-4 font-medium text-gray-600">Category</th>
                                <th className="p-4 font-medium text-gray-600">Title</th>
                                <th className="p-4 font-medium text-gray-600">Raised By</th>
                                <th className="p-4 font-medium text-gray-600">Status</th>
                                <th className="p-4 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                                    </td>
                                </tr>
                            ) : disputes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No active disputes.
                                    </td>
                                </tr>
                            ) : (
                                disputes.map(dispute => (
                                    <tr key={dispute.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-mono text-sm text-gray-500">{dispute.id.slice(0, 8)}</td>
                                        <td className="p-4 text-sm">{dispute.category.replace(/_/g, ' ')}</td>
                                        <td className="p-4 font-medium text-gray-900">{dispute.title}</td>
                                        <td className="p-4 text-sm">{dispute.raised_by?.full_name}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${dispute.status === DisputeStatus.OPEN ? 'bg-red-100 text-red-800' :
                                                    dispute.status === DisputeStatus.UNDER_REVIEW ? 'bg-amber-100 text-amber-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {dispute.status === DisputeStatus.OPEN && <AlertCircle className="w-3 h-3" />}
                                                {dispute.status === DisputeStatus.UNDER_REVIEW && <Clock className="w-3 h-3" />}
                                                {dispute.status === DisputeStatus.RESOLVED && <CheckCircle className="w-3 h-3" />}
                                                {dispute.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <Link
                                                href={`/admin/disputes/${dispute.id}`}
                                                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
