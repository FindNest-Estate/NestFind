"use client";

import { useState, useEffect } from "react";
import { getVisits, cancelVisit } from "@/lib/api/visits";
import { Visit, VisitStatus } from "@/lib/types/visit";
import { VisitCard } from "@/components/VisitCard";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function VisitsPage() {
    const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
    const [visits, setVisits] = useState<Visit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadVisits();
    }, [activeTab]);

    async function loadVisits() {
        setIsLoading(true);
        try {
            // Mapping tabs to status filters
            let statusFilter = '';
            if (activeTab === 'upcoming') {
                statusFilter = [VisitStatus.REQUESTED, VisitStatus.APPROVED, VisitStatus.REJECTED].join(',');
            } else if (activeTab === 'completed') {
                statusFilter = [VisitStatus.COMPLETED, VisitStatus.CHECKED_IN].join(',');
            } else {
                statusFilter = [VisitStatus.CANCELLED, VisitStatus.NO_SHOW].join(',');
            }

            const data = await getVisits(statusFilter);
            setVisits(data.visits);
        } catch (err: any) {
            setError(err.message || "Failed to load visits");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">My Visits</h1>
                    <Link
                        href="/properties"
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        Browse Properties →
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-200 p-1 rounded-xl mb-6 w-fit">
                    {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
                ) : visits.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">No visits found in this category.</p>
                        <Link
                            href="/properties"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            Find a Property to Visit
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visits.map(visit => (
                            <VisitCard key={visit.id} visit={visit} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
