"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getVisits, cancelVisit } from "@/lib/api/visits";
import { Visit, VisitStatus } from "@/lib/types/visit";
import { VisitCard } from "@/components/VisitCard";
import { Loader2, Calendar as CalendarIcon, ListChecks, Star, MapPin } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import VisitsCalendar from "@/components/buyer/VisitsCalendar";
import VisitPreparationChecklist from "@/components/buyer/VisitPreparationChecklist";
import PostVisitRating from "@/components/buyer/PostVisitRating";

export default function VisitsPage() {
    const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [visits, setVisits] = useState<Visit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showRating, setShowRating] = useState(false);

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

    const handleDateSelect = (date: Date) => {
        // Handle date selection for calendar view
        console.log('Selected date:', date);
        // TODO: Filter visits by selected date or open scheduling modal
    };

    const handleRatingSubmit = (rating: any) => {
        console.log('Visit rating:', rating);
        // TODO: Submit to backend
        setShowRating(false);
    };

    // Convert visits for calendar component
    const calendarVisits = visits.map(v => ({
        id: v.id,
        propertyTitle: v.property?.title || 'Unknown Property',
        propertyAddress: v.property?.address || 'Unknown Address',
        scheduledDate: v.scheduled_date || new Date().toISOString(),
        status: v.status
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 pt-24">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Property Visits</h1>
                            <p className="text-gray-600">Schedule, prepare, and track your property tours</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            <div className="flex gap-1 bg-gray-200 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <ListChecks className="w-4 h-4" />
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    Calendar
                                </button>
                            </div>

                            <Link
                                href="/properties"
                                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                Schedule Visit
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-200 p-1 rounded-xl mb-6 w-fit">
                    {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
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
                    <div className="flex justify-center items-center py-20">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Loading your visits...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="glass-card p-6">
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200">
                            {error}
                        </div>
                    </div>
                ) : visits.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 glass-card"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapPin className="w-10 h-10 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">No visits found</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            {activeTab === 'upcoming'
                                ? 'Schedule your first property visit to begin your home search journey!'
                                : activeTab === 'completed'
                                    ? 'No completed visits yet. Visit some properties to see them here.'
                                    : 'No cancelled visits.'}
                        </p>
                        <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            Find Properties to Visit <MapPin className="w-5 h-5" />
                        </Link>
                    </motion.div>
                ) : viewMode === 'calendar' ? (
                    /* Calendar View */
                    <VisitsCalendar visits={calendarVisits} onDateSelect={handleDateSelect} />
                ) : (
                    /* List View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Visits List */}
                        <div className="lg:col-span-2 space-y-4">
                            <AnimatePresence mode="popLayout">
                                {visits.map((visit, index) => (
                                    <motion.div
                                        key={visit.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => setSelectedVisit(visit)}
                                        className={`cursor-pointer transition-all ${selectedVisit?.id === visit.id ? 'ring-2 ring-purple-500' : ''
                                            }`}
                                    >
                                        <VisitCard visit={visit} />

                                        {/* Quick Actions */}
                                        {selectedVisit?.id === visit.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 flex gap-2"
                                            >
                                                {visit.status === 'APPROVED' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowChecklist(true);
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <ListChecks className="w-4 h-4" />
                                                        View Checklist
                                                    </button>
                                                )}
                                                {visit.status === 'COMPLETED' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowRating(true);
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Star className="w-4 h-4" />
                                                        Rate Visit
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Side Panel */}
                        <div className="lg:col-span-1">
                            <AnimatePresence mode="wait">
                                {showChecklist && selectedVisit ? (
                                    <motion.div
                                        key="checklist"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <button
                                            onClick={() => setShowChecklist(false)}
                                            className="mb-4 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                        >
                                            ← Back
                                        </button>
                                        <VisitPreparationChecklist
                                            visitId={selectedVisit.id}
                                            propertyTitle={selectedVisit.property?.title || 'Property'}
                                            scheduledDate={selectedVisit.scheduled_date || ''}
                                        />
                                    </motion.div>
                                ) : showRating && selectedVisit ? (
                                    <motion.div
                                        key="rating"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <button
                                            onClick={() => setShowRating(false)}
                                            className="mb-4 text-sm text-gray-600 hover:text-gray-900 font-medium"
                                        >
                                            ← Back
                                        </button>
                                        <PostVisitRating
                                            visitId={selectedVisit.id}
                                            propertyTitle={selectedVisit.property?.title || 'Property'}
                                            propertyAddress={selectedVisit.property?.address || 'Address'}
                                            onSubmit={handleRatingSubmit}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="info"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="glass-card p-6"
                                    >
                                        <h3 className="font-bold text-gray-900 mb-4">Visit Tools</h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                <div className="flex items-start gap-3">
                                                    <ListChecks className="w-6 h-6 text-blue-600" />
                                                    <div>
                                                        <p className="font-semibold text-blue-900">Preparation Checklist</p>
                                                        <p className="text-sm text-blue-700">Stay organized with our comprehensive visit checklist</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                                <div className="flex items-start gap-3">
                                                    <Star className="w-6 h-6 text-emerald-600" />
                                                    <div>
                                                        <p className="font-semibold text-emerald-900">Post-Visit Rating</p>
                                                        <p className="text-sm text-emerald-700">Rate and take notes after each visit</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-6">
                                            Select a visit to access tools and manage your visit
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
