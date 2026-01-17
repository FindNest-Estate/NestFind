"use client";

import { useState, useEffect, use } from "react";
import { getVisitById, approveVisit, rejectVisit, startVisitSession, completeVisit, markNoShow, respondToCounter, submitAgentFeedback } from "@/lib/api/visits";
import { Visit, VisitStatus, AgentFeedbackData } from "@/lib/types/visit";
import { Loader2, MapPin, Calendar, Clock, Navigation, CheckCircle, XCircle, Key, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
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
            // If already checked in, mark session as started
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
        <div className="space-y-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between mb-6">
                        <h1 className="text-xl font-bold">Visit #{visit.id.slice(0, 8)}</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${visit.status === VisitStatus.APPROVED ? 'bg-green-100 text-green-800' :
                            isCheckedIn ? 'bg-blue-100 text-blue-800' :
                                isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {isCheckedIn ? 'In Progress' : visit.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="space-y-4 mb-8">
                        {/* Property Info */}
                        <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            {visit.property?.thumbnail_url && (
                                <img src={visit.property.thumbnail_url} className="w-16 h-16 rounded-lg object-cover" />
                            )}
                            <div>
                                <h3 className="font-semibold">{visit.property?.title}</h3>
                                <p className="text-sm text-gray-500">{visit.property?.address}</p>
                            </div>
                        </div>

                        {/* Buyer Info */}
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <h3 className="font-semibold text-blue-900 mb-2">Buyer Details</h3>
                            <p className="text-blue-800">{visit.buyer?.full_name}</p>
                            <p className="text-blue-700 text-sm mt-1">{visit.buyer_message ? `"${visit.buyer_message}"` : 'No message'}</p>
                        </div>

                        {/* Session Active Indicator */}
                        {isCheckedIn && (
                            <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Session Active</h3>
                                        <p className="text-emerald-100 text-sm">OTP has been sent to buyer</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3 text-sm">
                                    Ask the buyer to show you their verification code from their app or email to confirm their identity.
                                </div>
                            </div>
                        )}
                    </div>

                    {locationError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            {locationError}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="grid gap-3">
                        {visit.status === VisitStatus.REQUESTED && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReject}
                                    disabled={isActionLoading}
                                    className="flex-1 py-3 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={isActionLoading}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                                >
                                    Approve Request
                                </button>
                            </div>
                        )}

                        {visit.status === VisitStatus.APPROVED && (
                            <button
                                onClick={handleStartSession}
                                disabled={isActionLoading}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                {isActionLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <MapPin className="w-5 h-5" />
                                )}
                                Start Visit Session
                            </button>
                        )}

                        {isCheckedIn && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleNoShow}
                                    disabled={isActionLoading}
                                    className="flex-1 py-3 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50"
                                >
                                    Buyer No-Show
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={isActionLoading}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                                >
                                    Complete Visit
                                </button>
                            </div>
                        )}

                        {/* Negotiation Controls */}
                        {(visit.allowed_actions?.includes('approve') || visit.allowed_actions?.includes('accept_counter') || visit.allowed_actions?.includes('counter')) && (
                            <div className="flex flex-col gap-3">
                                {visit.status === VisitStatus.COUNTERED && (
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-2">
                                        <p className="text-amber-900 font-medium">Counter Offer Received</p>
                                        <p className="text-amber-800 text-sm">Proposed: {visit.counter_date && format(new Date(visit.counter_date), "PPp")}</p>
                                        {visit.counter_message && <p className="text-amber-700 text-sm mt-1">"{visit.counter_message}"</p>}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    {(visit.allowed_actions?.includes('reject')) && (
                                        <button
                                            onClick={handleReject}
                                            disabled={isActionLoading}
                                            className="px-4 py-3 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50"
                                        >
                                            Reject
                                        </button>
                                    )}

                                    {visit.allowed_actions?.includes('counter') && (
                                        <button
                                            onClick={() => setShowCounterModal(true)}
                                            disabled={isActionLoading}
                                            className="flex-1 py-3 border border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50"
                                        >
                                            {visit.status === VisitStatus.COUNTERED ? "Counter Back" : "Counter/Propose New Time"}
                                        </button>
                                    )}

                                    {visit.allowed_actions?.includes('approve') && (
                                        <button
                                            onClick={handleApprove}
                                            disabled={isActionLoading}
                                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                                        >
                                            Approve
                                        </button>
                                    )}

                                    {visit.allowed_actions?.includes('accept_counter') && (
                                        <button
                                            onClick={handleAcceptCounter}
                                            disabled={isActionLoading}
                                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                                        >
                                            Accept Counter
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Section - Show for completed visits */}
                {(isCompleted || showFeedbackForm) && !feedbackSubmitted && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Visit Feedback</h3>
                                <p className="text-gray-500 text-sm">Share your observations about this visit</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <StarRating
                                label="Buyer Interest Level"
                                value={feedback.buyer_interest_level || 0}
                                onChange={(v) => setFeedback({ ...feedback, buyer_interest_level: v })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Perceived Budget
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['LOW', 'MEDIUM', 'HIGH', 'PREMIUM'].map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setFeedback({ ...feedback, buyer_perceived_budget: level as any })}
                                            className={`py-2 rounded-lg border text-sm ${feedback.buyer_perceived_budget === level ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recommended Action
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['PROCEED', 'NEGOTIATE', 'PASS', 'UNDECIDED'].map(action => (
                                        <button
                                            key={action}
                                            type="button"
                                            onClick={() => setFeedback({ ...feedback, recommended_action: action as any })}
                                            className={`py-2 rounded-lg border text-sm ${feedback.recommended_action === action ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Property Condition Notes
                                </label>
                                <textarea
                                    value={feedback.property_condition_notes}
                                    onChange={(e) => setFeedback({ ...feedback, property_condition_notes: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                                    rows={2}
                                    placeholder="Any observations about property condition..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Buyer Questions
                                </label>
                                <textarea
                                    value={feedback.buyer_questions}
                                    onChange={(e) => setFeedback({ ...feedback, buyer_questions: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                                    rows={2}
                                    placeholder="Key questions asked by the buyer..."
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="follow-up"
                                    checked={feedback.follow_up_required}
                                    onChange={(e) => setFeedback({ ...feedback, follow_up_required: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <label htmlFor="follow-up" className="text-sm text-gray-700">
                                    Follow-up required
                                </label>
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

                {/* Feedback Submitted */}
                {feedbackSubmitted && (
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 flex items-center gap-4 mt-6">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                        <div>
                            <h3 className="font-bold text-emerald-900">Feedback Submitted!</h3>
                            <p className="text-emerald-700 text-sm">Thank you for your observations.</p>
                        </div>
                    </div>
                )}
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