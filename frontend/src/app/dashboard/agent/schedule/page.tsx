"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Loader2, Calendar, Clock, Check, X, MapPin, User, CheckCircle,
    MessageSquare, Lock, Phone, Navigation, MoreVertical, Filter,
    ChevronRight, Shield, AlertCircle
} from "lucide-react";
import Link from "next/link";
import ChatWindow from "@/components/chat/ChatWindow";
import AgentLayout from "@/components/dashboard/AgentLayout";
import { toast } from "sonner";

export default function AgentSchedulePage() {
    const [schedule, setSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [chatModal, setChatModal] = useState({ show: false, partnerId: 0, partnerName: "", propertyId: 0 });

    const fetchSchedule = async () => {
        try {
            const data = await api.bookings.agentSchedule();
            setSchedule(data);
        } catch (error) {
            console.error("Failed to fetch schedule", error);
            toast.error("Failed to load schedule");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, []);

    const handleStatusUpdate = async (id: number, status: string | { action: string, slot?: string, reason?: string, notes?: string }) => {
        try {
            const payload = typeof status === 'string' ? { action: status } : status;
            await api.bookings.updateStatus(id, payload);
            fetchSchedule();
            toast.success("Status updated successfully");
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        }
    };

    const [counterModal, setCounterModal] = useState({ show: false, bookingId: 0, slot: "" });
    const [otpModal, setOtpModal] = useState({ show: false, bookingId: 0, otp: "" });
    const [completionModal, setCompletionModal] = useState<{
        show: boolean;
        bookingId: number;
        notes: string;
        images: string[];
        step: number;
        locationStatus: 'idle' | 'verifying' | 'success' | 'error';
        feedback: any;
        coords?: { lat: number, lng: number };
    }>({
        show: false,
        bookingId: 0,
        notes: "",
        images: [],
        step: 1,
        locationStatus: 'idle',
        feedback: {}
    });

    const handleStartVisit = async () => {
        try {
            await api.bookings.startVisit(otpModal.bookingId, otpModal.otp);
            setOtpModal({ show: false, bookingId: 0, otp: "" });
            fetchSchedule();
            toast.success("Visit started successfully!");
        } catch (error) {
            toast.error("Invalid OTP or connection error");
        }
    };

    const handleCompleteVisit = async () => {
        try {
            await api.bookings.completeVisit(completionModal.bookingId, {
                check_in_location: completionModal.coords ? `${completionModal.coords.lat},${completionModal.coords.lng}` : "Agent Dashboard",
                latitude: completionModal.coords?.lat,
                longitude: completionModal.coords?.lng,
                agent_notes: completionModal.notes,
                visit_images: completionModal.images,
                buyer_interest: completionModal.feedback.interest,
                buyer_timeline: completionModal.feedback.timeline,
                buyer_budget_feedback: completionModal.feedback.budget,
                location_check_result: completionModal.locationStatus === 'success' ? 'MATCH' : completionModal.locationStatus === 'error' ? 'MISMATCH' : 'NOT_VERIFIED'
            });
            setCompletionModal({ show: false, bookingId: 0, notes: "", images: [], step: 1, locationStatus: 'idle', feedback: {} });
            fetchSchedule();
            toast.success("Visit completed successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to complete visit");
        }
    };

    const handleCounter = async () => {
        if (!counterModal.slot) return toast.error("Please select a time");

        try {
            // Convert datetime-local format to ISO string
            const isoSlot = new Date(counterModal.slot).toISOString();

            await api.bookings.updateStatus(counterModal.bookingId, {
                action: 'COUNTER',
                slot: isoSlot
            });
            setCounterModal({ show: false, bookingId: 0, slot: "" });
            fetchSchedule();
            toast.success("Counter proposal sent!");
        } catch (error) {
            console.error("Failed to send counter proposal", error);
            toast.error("Failed to send counter proposal");
        }
    };

    if (loading) {
        return (
            <AgentLayout title="My Schedule">
                <div className="flex justify-center items-center h-[60vh]">
                    <Loader2 className="animate-spin text-rose-500" size={32} />
                </div>
            </AgentLayout>
        );
    }

    const groupedVisits: { [key: string]: any[] } = {};
    schedule?.upcoming.forEach((visit: any) => {
        // Use approved_slot, agent_suggested_slot, or visit_date for grouping
        const visitDateTime = visit.approved_slot || visit.agent_suggested_slot || visit.visit_date;
        if (!visitDateTime) return; // Skip if no date at all
        const date = new Date(visitDateTime).toDateString();
        if (!groupedVisits[date]) groupedVisits[date] = [];
        groupedVisits[date].push(visit);
    });

    return (
        <AgentLayout title="My Schedule">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    <div className="xl:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                <Calendar className="text-rose-500" size={24} />
                                Timeline
                            </h2>
                            <p className="text-gray-500 mt-1">Your upcoming visits and appointments.</p>
                        </div>

                        {schedule?.upcoming.length === 0 ? (
                            <EmptyState
                                icon={Calendar}
                                title="No upcoming visits"
                                description="Your schedule is clear. Use this time to follow up with leads!"
                            />
                        ) : (
                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                {Object.entries(groupedVisits).map(([date, visits]) => (
                                    <div key={date} className="relative group">
                                        <div className="sticky top-20 z-10 mb-6 ml-12 md:ml-0 md:text-center">
                                            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-sm font-semibold text-gray-800 shadow-sm">
                                                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        <div className="space-y-6">
                                            {visits.map((visit: any) => (
                                                <TimelineCard
                                                    key={visit.id}
                                                    visit={visit}
                                                    onChat={() => setChatModal({ show: true, partnerId: visit.user_id, partnerName: visit.user?.first_name, propertyId: visit.property_id })}
                                                    onStart={() => {
                                                        const generate = async () => {
                                                            try {
                                                                await api.bookings.generateOTP(visit.id);
                                                                setOtpModal({ show: true, bookingId: visit.id, otp: "" });
                                                                toast.info("OTP sent to buyer's app");
                                                            } catch (e) { toast.error("Failed to generate OTP"); }
                                                        };
                                                        generate();
                                                    }}
                                                    onComplete={() => setCompletionModal({
                                                        show: true,
                                                        bookingId: visit.id,
                                                        notes: "",
                                                        images: [],
                                                        step: 1,
                                                        locationStatus: 'idle',
                                                        feedback: {}
                                                    })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {schedule?.past.length > 0 && (
                            <div className="pt-12">
                                <div className="flex items-center gap-4 mb-6">
                                    <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Past History</h3>
                                    <div className="h-px bg-gray-200 flex-1" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                                    {schedule.past.map((visit: any) => (
                                        <div key={visit.id} className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-800">{visit.property?.title}</p>
                                                <p className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${visit.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                {visit.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MessageSquare size={18} className="text-indigo-500" />
                                    Requests Inbox
                                </h3>
                                {schedule?.requests.length > 0 && (
                                    <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {schedule.requests.length}
                                    </span>
                                )}
                            </div>

                            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {schedule?.requests.length === 0 ? (
                                    <div className="text-center py-10">
                                        <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                                        <p className="text-gray-500 text-sm">All received requests handled!</p>
                                    </div>
                                ) : (
                                    schedule?.requests.map((request: any) => (
                                        <InboxItem
                                            key={request.id}
                                            request={request}
                                            onAccept={() => handleStatusUpdate(request.id, {
                                                action: 'APPROVE',
                                                slot: request.preferred_time_slots?.[0] || request.agent_suggested_slot || (request.visit_date && request.visit_time ? new Date(`${request.visit_date} ${request.visit_time}`).toISOString() : new Date().toISOString())
                                            })}
                                            onDecline={() => handleStatusUpdate(request.id, { action: 'REJECT', reason: 'Declined' })}
                                            onCounter={() => setCounterModal({ show: true, bookingId: request.id, slot: "" })}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl" />

                            <h3 className="font-semibold mb-6 relative z-10 flex items-center gap-2">
                                <AlertCircle size={18} className="text-indigo-300" />
                                Performance
                            </h3>

                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">Today</p>
                                    <p className="text-3xl font-bold">{schedule?.upcoming.filter((v: any) => new Date(v.visit_date).toDateString() === new Date().toDateString()).length}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">Pending</p>
                                    <p className="text-3xl font-bold">{schedule?.requests.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Chat Modal */}
                <ChatModalWrapper show={chatModal.show} onClose={() => setChatModal({ show: false, partnerId: 0, partnerName: "", propertyId: 0 })}>
                    <ChatWindow
                        partnerId={chatModal.partnerId}
                        partnerName={chatModal.partnerName}
                        onBack={() => setChatModal({ show: false, partnerId: 0, partnerName: "", propertyId: 0 })}
                    />
                </ChatModalWrapper>

                {/* OTP Modal */}
                {otpModal.show && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="text-rose-600" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Security Check</h3>
                                <p className="text-gray-500 text-sm mt-2">Ask the buyer for the 4-digit code displayed on their app to start the visit.</p>
                            </div>

                            <div className="flex justify-center mb-8">
                                <input
                                    type="text"
                                    placeholder="0000"
                                    maxLength={4}
                                    className="w-48 text-center text-4xl font-bold tracking-[0.5em] border-b-2 border-gray-200 focus:border-rose-500 outline-none py-2 text-gray-900 placeholder:text-gray-200 transition-colors bg-white font-mono"
                                    value={otpModal.otp}
                                    onChange={(e) => setOtpModal(prev => ({ ...prev, otp: e.target.value }))}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setOtpModal({ show: false, bookingId: 0, otp: "" })}
                                    className="py-3 items-center justify-center rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition flex"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartVisit}
                                    className="py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none transition-all"
                                    disabled={otpModal.otp.length < 4}
                                >
                                    Verify Code
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Completion Modal - Wizard */}
                {completionModal.show && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Complete Visit #{completionModal.bookingId}</h3>
                                    <p className="text-gray-400 text-xs mt-1">Submit report to close this visit.</p>
                                </div>
                                <button onClick={() => setCompletionModal({ show: false, bookingId: 0, notes: "", images: [], step: 1, locationStatus: 'idle', feedback: {} })} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {/* Step 1: Location Verification */}
                                {completionModal.step === 1 && (
                                    <div className="text-center py-8">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors ${completionModal.locationStatus === 'success' ? 'bg-green-100 text-green-600' :
                                            completionModal.locationStatus === 'error' ? 'bg-red-100 text-red-600' :
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>
                                            <MapPin size={40} className={completionModal.locationStatus === 'verifying' ? 'animate-bounce' : ''} />
                                        </div>

                                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                                            {completionModal.locationStatus === 'success' ? 'Location Verified' :
                                                completionModal.locationStatus === 'error' ? 'Location Mismatch' : 'Verify Location'}
                                        </h4>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
                                            {completionModal.locationStatus === 'success' ? 'You are at the property location.' :
                                                completionModal.locationStatus === 'error' ? 'You seem to be far from the property. You can still proceed but it will be flagged.' :
                                                    'Please verify that you are at the property location before completing the visit.'}
                                        </p>

                                        {completionModal.locationStatus === 'idle' && (
                                            <button
                                                onClick={() => {
                                                    setCompletionModal(prev => ({ ...prev, locationStatus: 'verifying' }));
                                                    navigator.geolocation.getCurrentPosition(
                                                        (pos) => {
                                                            setTimeout(() => {
                                                                setCompletionModal(prev => ({
                                                                    ...prev,
                                                                    locationStatus: 'success',
                                                                    coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                                                                }));
                                                            }, 1500);
                                                        },
                                                        () => {
                                                            toast.error("Could not get location");
                                                            setCompletionModal(prev => ({ ...prev, locationStatus: 'error' }));
                                                        }
                                                    );
                                                }}
                                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                                            >
                                                Check Location
                                            </button>
                                        )}
                                        {completionModal.locationStatus !== 'idle' && completionModal.locationStatus !== 'verifying' && (
                                            <button
                                                onClick={() => setCompletionModal(prev => ({ ...prev, step: 2 }))}
                                                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:bg-black transition flex items-center gap-2 mx-auto"
                                            >
                                                Next Step <ChevronRight size={16} />
                                            </button>
                                        )}
                                        {completionModal.locationStatus === 'error' && (
                                            <button onClick={() => setCompletionModal(prev => ({ ...prev, step: 2 }))} className="block mx-auto mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
                                                Skip verification
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Step 2: Feedback Form */}
                                {completionModal.step === 2 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">Buyer Interest Level</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['HIGH', 'MEDIUM', 'LOW', 'NO_INTEREST'].map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setCompletionModal(prev => ({ ...prev, feedback: { ...prev.feedback, interest: level } }))}
                                                        className={`py-2 rounded-lg text-xs font-bold border-2 transition ${completionModal.feedback?.interest === level ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                                            }`}
                                                    >
                                                        {level.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">Timeline</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['IMMEDIATE', '1_MONTH', '3_MONTHS', 'JUST_BROWSING'].map((time) => (
                                                    <button
                                                        key={time}
                                                        onClick={() => setCompletionModal(prev => ({ ...prev, feedback: { ...prev.feedback, timeline: time } }))}
                                                        className={`py-2 px-3 text-left rounded-lg text-xs font-medium border transition ${completionModal.feedback?.timeline === time ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {time.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">Budget Fit</label>
                                            <div className="flex gap-2">
                                                {['WITHIN_BUDGET', 'OVER_BUDGET', 'UNDER_BUDGET'].map((fit) => (
                                                    <button
                                                        key={fit}
                                                        onClick={() => setCompletionModal(prev => ({ ...prev, feedback: { ...prev.feedback, budget: fit } }))}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${completionModal.feedback?.budget === fit ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {fit.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setCompletionModal(prev => ({ ...prev, step: 3 }))}
                                            disabled={!completionModal.feedback?.interest || !completionModal.feedback?.timeline}
                                            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition mt-4"
                                        >
                                            Next: Notes & Media
                                        </button>
                                    </div>
                                )}

                                {/* Step 3: Notes & Media */}
                                {completionModal.step === 3 && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Visit Notes</label>
                                            <textarea
                                                className="w-full h-24 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-rose-500 outline-none resize-none bg-gray-50 text-sm"
                                                placeholder="Key questions asked, concerns raised, features liked..."
                                                value={completionModal.notes}
                                                onChange={e => setCompletionModal(prev => ({ ...prev, notes: e.target.value }))}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Photos</label>
                                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-white transition cursor-pointer">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-400">
                                                    <User size={20} />
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium">Click to upload or drag and drop</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Maximum 5 photos</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => setCompletionModal(prev => ({ ...prev, step: 2 }))}
                                                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleCompleteVisit}
                                                className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-700 transition shadow-rose-200"
                                            >
                                                Complete Visit
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Counter Modal */}
                {counterModal.show && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Propose New Time</h3>
                            <p className="text-gray-500 text-sm mb-6">Select a new date and time for this visit.</p>

                            <input
                                type="datetime-local"
                                className="w-full border border-gray-200 rounded-xl p-3 mb-6 focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50"
                                onChange={(e) => setCounterModal(prev => ({ ...prev, slot: e.target.value }))}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCounterModal({ show: false, bookingId: 0, slot: "" })}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCounter}
                                    className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AgentLayout>
    );
}

function TimelineCard({ visit, onChat, onStart, onComplete }: any) {
    const isToday = new Date(visit.visit_date).toDateString() === new Date().toDateString();

    return (
        <div className="relative pl-8 md:pl-0">
            <div className="md:hidden absolute left-0 top-0 bottom-0 w-0.5 bg-gray-100 ml-5" />

            <div className={`absolute left-0 md:left-auto md:right-full md:mr-8 top-6 w-3 h-3 rounded-full border-2 z-10 
                ${visit.status === 'APPROVED' ? 'bg-green-500 border-green-100' :
                    visit.status === 'IN_PROGRESS' ? 'bg-rose-500 border-rose-100 animate-pulse' : 'bg-gray-300 border-gray-100'}
                ml-[1.15rem] md:ml-0
            `} />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group">
                <div className="flex flex-col md:flex-row gap-5">

                    <div className="md:w-48 flex-shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
                        <div className="mb-3 md:mb-0">
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono">#{visit.id}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
                                <Clock size={18} />
                                {(() => {
                                    const time = visit.visit_time || visit.approved_slot || visit.agent_suggested_slot;
                                    if (!time) return 'TBD';
                                    if (time.includes('T')) {
                                        return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    }
                                    return time.slice(0, 5);
                                })()}
                            </div>
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                                {isToday ? 'Today' : 'Upcoming'}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 md:mt-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold border border-white shadow-sm">
                                {visit.user?.first_name?.[0]}
                            </div>
                            <div className="text-right md:text-left">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{visit.user?.first_name} {visit.user?.last_name}</p>
                                <p className="text-xs text-gray-500">Buyer</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">{visit.property?.title}</h4>
                                <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                                    <MapPin size={14} className="text-gray-400" />
                                    {visit.property?.address}
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${visit.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                visit.status === 'IN_PROGRESS' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {visit.status?.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                            <button onClick={onChat} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                                <MessageSquare size={16} />
                                Message
                            </button>

                            {visit.status === 'APPROVED' && (
                                <button onClick={onStart} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all ml-auto">
                                    <Shield size={16} />
                                    Start Visit
                                </button>
                            )}

                            {visit.status === 'IN_PROGRESS' && (
                                <button onClick={onComplete} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200 transition-all ml-auto">
                                    <CheckCircle size={16} />
                                    Complete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


function InboxItem({ request, onAccept, onDecline, onCounter }: any) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {request.user?.first_name?.[0]}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{request.user?.first_name} {request.user?.last_name}</p>
                        <p className="text-xs text-gray-500">{request.property?.title}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {(() => {
                            const time = request.visit_time || request.preferred_time_slots?.[0] || request.agent_suggested_slot;
                            if (!time) return 'Flexible';
                            if (time.includes('T')) {
                                return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                            return time;
                        })()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {(() => {
                            const date = request.visit_date || request.preferred_time_slots?.[0] || request.agent_suggested_slot;
                            if (!date) return 'Pending';
                            return new Date(date).toLocaleDateString();
                        })()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button onClick={onDecline} className="py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-100">
                    Decline
                </button>
                <button onClick={onCounter} className="py-1.5 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-gray-100">
                    Counter
                </button>
                <button onClick={onAccept} className="py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm">
                    Accept
                </button>
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }: any) {
    return (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="text-gray-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">{description}</p>
        </div>
    );
}

function ChatModalWrapper({ children, show, onClose }: any) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md relative shadow-2xl overflow-hidden h-[600px] flex flex-col">
                {children}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition z-10"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
