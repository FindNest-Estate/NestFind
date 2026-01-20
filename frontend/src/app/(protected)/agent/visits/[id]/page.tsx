"use client";

import { useState, useEffect, use } from "react";
import { getVisitById, approveVisit, rejectVisit, startVisitSession, completeVisit, markNoShow, respondToCounter, submitAgentFeedback } from "@/lib/api/visits";
import { Visit, VisitStatus, AgentFeedbackData } from "@/lib/types/visit";
import { Loader2, MapPin, Calendar, Clock, Navigation, CheckCircle, XCircle, Key, MessageSquare, Star, ArrowLeft, User, Mail, Phone, CalendarDays, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import CounterVisitModal from "@/components/property/CounterVisitModal";

interface PageParams {
    id: string;
}

export default function AgentVisitDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [visit, setVisit] = useState<Visit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showCounterModal, setShowCounterModal] = useState(false);

    // Session state
    const [sessionStarted, setSessionStarted] = useState(false);
    const [otpExpiry, setOtpExpiry] = useState<string | null>(null);

    // Feedback state
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedback, setFeedback] = useState<AgentFeedbackData>({
        buyer_interest_level: 0,
        buyer_perceived_budget: undefined,
        property_condition_notes: '',
        buyer_questions: '',
        follow_up_required: false,
        recommended_action: undefined,
        additional_notes: ''
    });

    useEffect(() => {
        loadData();
    }, [resolvedParams.id]);

    async function loadData() {
        try {
            const data = await getVisitById(resolvedParams.id);
            setVisit(data.visit ?? null);
            if (data.visit?.status === 'CHECKED_IN') {
                setSessionStarted(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleApprove = async () => {
        setIsActionLoading(true);
        try {
            await approveVisit(resolvedParams.id, visit?.preferred_date);
            loadData();
        } catch (err) { alert("Failed to approve"); }
        finally { setIsActionLoading(false); }
    };

    const handleReject = async () => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        setIsActionLoading(true);
        try {
            if (visit?.status === VisitStatus.COUNTERED) {
                await respondToCounter(resolvedParams.id, false);
            } else {
                await rejectVisit(resolvedParams.id, reason);
            }
            loadData();
        } catch (err) { alert("Failed to reject"); }
        finally { setIsActionLoading(false); }
    };

    const handleAcceptCounter = async () => {
        setIsActionLoading(true);
        try {
            await respondToCounter(resolvedParams.id, true);
            loadData();
        } catch (err) { alert("Failed to accept"); }
        finally { setIsActionLoading(false); }
    };

    const handleStartSession = () => {
        setIsActionLoading(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported");
            setIsActionLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const result = await startVisitSession(
                        resolvedParams.id,
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    if (result.success) {
                        setSessionStarted(true);
                        const visitData = result.visit as any;
                        if (visitData?.otp_expires_at) {
                            setOtpExpiry(visitData.otp_expires_at);
                        }
                        loadData();
                    } else {
                        setLocationError(result.error || "Failed to start session");
                        alert(result.error || "Failed to start session");
                    }
                } catch (err: any) {
                    setLocationError(err.message || "Failed to start session");
                    alert(err.message || "Failed to start session");
                } finally {
                    setIsActionLoading(false);
                }
            },
            (err) => {
                setLocationError("Unable to retrieve location. Please enable GPS.");
                setIsActionLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleComplete = async () => {
        if (!confirm("Complete this visit?")) return;
        setIsActionLoading(true);
        try {
            await completeVisit(resolvedParams.id);
            setShowFeedbackForm(true);
            loadData();
        } catch (err) { alert("Failed to complete"); }
        finally { setIsActionLoading(false); }
    };

    const handleNoShow = async () => {
        if (!confirm("Mark buyer as No Show?")) return;
        setIsActionLoading(true);
        try {
            await markNoShow(resolvedParams.id);
            loadData();
        } catch (err) { alert("Failed"); }
        finally { setIsActionLoading(false); }
    };

    const handleSubmitFeedback = async () => {
        setIsSubmittingFeedback(true);
        try {
            const result = await submitAgentFeedback(resolvedParams.id, feedback);
            if (result.success) {
                setFeedbackSubmitted(true);
                setShowFeedbackForm(false);
            } else {
                alert(result.error || 'Failed to submit feedback');
            }
        } catch (err) {
            alert('Failed to submit feedback');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className={`p-1 ${value >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                        <Star className="w-6 h-6 fill-current" />
                    </button>
                ))}
            </div>
        </div>
    );

    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    if (!visit) return <div className="text-center py-20 text-slate-500">Visit not found</div>;

    const isCheckedIn = visit.status === VisitStatus.CHECKED_IN;
    const isCompleted = visit.status === VisitStatus.COMPLETED;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back Nav Link */}
            {/* <Link href="/agent/visits" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Visits
            </Link> */}

            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Visit Details
                        <span className="text-slate-400 font-normal text-lg">#{visit.id.slice(0, 8)}</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        {visit.property?.address}
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border ${isCheckedIn ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        visit.status === VisitStatus.APPROVED ? 'bg-green-50 border-green-200 text-green-700' :
                            'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                    {isCheckedIn ? <Key className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {isCheckedIn ? 'Session Active' : visit.status.replace('_', ' ')}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Property & Session Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Property Card */}
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl overflow-hidden shadow-sm">
                        <div className="aspect-video w-full bg-slate-100 relative">
                            {visit.property?.thumbnail_url ? (
                                <img src={visit.property.thumbnail_url} className="w-full h-full object-cover" alt="Property" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <MapPin className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <h2 className="text-white text-xl font-bold">{visit.property?.title}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Session Active Panel */}
                    {isCheckedIn && (
                        <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Key className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Visit Session is Active</h3>
                                    <p className="text-emerald-100">Started on {format(new Date(), 'p')}</p>
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4 text-sm leading-relaxed border border-white/10">
                                <p className="font-semibold mb-1">Verify Buyer Identity</p>
                                Ask the buyer to show you their verification code (OTP) from their app or email.
                                Currently, the system has sent an OTP to the buyer.
                            </div>
                        </div>
                    )}

                    {/* Feedback Form */}
                    {(isCompleted || showFeedbackForm) && !feedbackSubmitted && (
                        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Agent Feedback</h3>
                                    <p className="text-gray-500 text-sm">Record your observations</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <StarRating
                                    label="Buyer Interest Level"
                                    value={feedback.buyer_interest_level || 0}
                                    onChange={(v) => setFeedback({ ...feedback, buyer_interest_level: v })}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Perceived Budget</label>
                                        <select
                                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                                            value={feedback.buyer_perceived_budget || ''}
                                            onChange={(e) => setFeedback({ ...feedback, buyer_perceived_budget: e.target.value as any })}
                                        >
                                            <option value="">Select Level</option>
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="PREMIUM">Premium</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Action</label>
                                        <select
                                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                                            value={feedback.recommended_action || ''}
                                            onChange={(e) => setFeedback({ ...feedback, recommended_action: e.target.value as any })}
                                        >
                                            <option value="">Select Action</option>
                                            <option value="PROCEED">Proceed</option>
                                            <option value="NEGOTIATE">Negotiate</option>
                                            <option value="PASS">Pass</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Notes</label>
                                    <textarea
                                        value={feedback.property_condition_notes}
                                        onChange={(e) => setFeedback({ ...feedback, property_condition_notes: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                                        rows={3}
                                        placeholder="Any observations about property condition..."
                                    />
                                </div>

                                <button
                                    onClick={handleSubmitFeedback}
                                    disabled={isSubmittingFeedback}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Feedback Confirmation */}
                    {feedbackSubmitted && (
                        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 flex items-center gap-4">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                            <div>
                                <h3 className="font-bold text-emerald-900">Feedback Submitted</h3>
                                <p className="text-emerald-700 text-sm">Thank you for helping improve our matching.</p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Actions & Buyer Info */}
                <div className="space-y-6">

                    {/* Logic for Actions Card */}
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Actions</h3>

                        <div className="space-y-3">
                            {/* REQUESTED */}
                            {visit.status === VisitStatus.REQUESTED && (
                                <>
                                    <button onClick={handleApprove} disabled={isActionLoading} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Approve Visit
                                    </button>
                                    <button onClick={handleReject} disabled={isActionLoading} className="w-full py-2.5 border border-gray-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2">
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </>
                            )}

                            {/* APPROVED */}
                            {visit.status === VisitStatus.APPROVED && (
                                <button onClick={handleStartSession} disabled={isActionLoading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95">
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                    Start Visit Session
                                </button>
                            )}

                            {/* IN PROGRESS */}
                            {isCheckedIn && (
                                <>
                                    <button onClick={handleComplete} disabled={isActionLoading} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Complete Visit
                                    </button>
                                    <button onClick={handleNoShow} disabled={isActionLoading} className="w-full py-2.5 border border-gray-300 text-orange-600 rounded-lg font-medium hover:bg-orange-50 flex items-center justify-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Mark No-Show
                                    </button>
                                </>
                            )}

                            {/* Negotiation Actions */}
                            {(visit.allowed_actions?.includes('counter') || visit.status === VisitStatus.COUNTERED) && (
                                <button onClick={() => setShowCounterModal(true)} disabled={isActionLoading} className="w-full py-2.5 border border-blue-200 text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center justify-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {visit.status === VisitStatus.COUNTERED ? "Counter Back" : "Reschedule / Counter"}
                                </button>
                            )}

                            {isCompleted && (
                                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 font-medium text-sm">
                                    No further actions available
                                </div>
                            )}

                            {locationError && (
                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                                    {locationError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buyer Info Card */}
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Buyer</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{visit.buyer?.full_name || 'Guest User'}</div>
                                <div className="text-xs text-gray-500">Prospective Buyer</div>
                            </div>
                        </div>
                        {visit.buyer_message && (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                                "{visit.buyer_message}"
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                            {visit.buyer?.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" /> {visit.buyer.email}
                                </div>
                            )}
                            {visit.buyer?.phone_number && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4" /> {visit.buyer.phone_number}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timings Card */}
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Schedule</h3>
                        <div className="flex items-start gap-3">
                            <CalendarDays className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                    {visit.confirmed_date ? format(new Date(visit.confirmed_date), 'PPPP') : format(new Date(visit.preferred_date), 'PPPP')}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {visit.confirmed_date ? format(new Date(visit.confirmed_date), 'p') : format(new Date(visit.preferred_date), 'p')}
                                </div>
                                {visit.confirmed_date && (
                                    <div className="uppercase text-[10px] font-bold tracking-wide text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded mt-1">Confirmed</div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <CounterVisitModal
                isOpen={showCounterModal}
                onClose={() => setShowCounterModal(false)}
                onSuccess={loadData}
                visitId={visit.id}
                propertyTitle={visit.property?.title || 'Property'}
            />
        </div>
    );
}