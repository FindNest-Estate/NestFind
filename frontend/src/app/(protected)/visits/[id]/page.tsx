"use client";

import { useState, useEffect, use } from "react";
import { getVisitById, cancelVisit, respondToCounter, getBuyerOTP, submitBuyerFeedback } from "@/lib/api/visits";
import { Visit, VisitStatus, VisitOTP, BuyerFeedbackData } from "@/lib/types/visit";
import { Loader2, MapPin, Calendar, User, Phone, Navigation, Key, Star, CheckCircle, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import CounterVisitModal from "@/components/property/CounterVisitModal";
import MakeOfferModal from "@/components/offers/MakeOfferModal";
import { DollarSign } from "lucide-react";

interface PageParams {
    id: string;
}

export default function VisitDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [visit, setVisit] = useState<Visit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);

    // OTP State
    const [otp, setOtp] = useState<VisitOTP | null>(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);

    // Feedback State
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedback, setFeedback] = useState<BuyerFeedbackData>({
        overall_rating: 0,
        agent_professionalism: 0,
        property_condition_rating: 0,
        property_as_described: undefined,
        interest_level: undefined,
        liked_aspects: '',
        concerns: '',
        would_recommend: undefined
    });

    useEffect(() => {
        loadData();
    }, [resolvedParams.id]);

    useEffect(() => {
        // Fetch OTP when visit is CHECKED_IN
        if (visit?.status === VisitStatus.CHECKED_IN) {
            fetchOTP();
        }
    }, [visit?.status]);

    const loadData = () => {
        setIsLoading(true);
        getVisitById(resolvedParams.id)
            .then(data => setVisit(data.visit ?? null))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    };

    const fetchOTP = async () => {
        setOtpLoading(true);
        setOtpError(null);
        try {
            const result = await getBuyerOTP(resolvedParams.id);
            if (result.success && result.otp) {
                setOtp(result.otp);
            } else {
                setOtpError(result.error || 'Failed to get OTP');
            }
        } catch (err) {
            setOtpError('Failed to fetch OTP');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this visit?")) return;

        setIsCancelling(true);
        try {
            await cancelVisit(resolvedParams.id, "Cancelled by buyer");
            loadData();
        } catch (err) {
            alert("Failed to cancel visit");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleRejectCounter = async () => {
        if (!confirm("Reject the counter offer? This will cancel the visit request.")) return;
        setIsResponding(true);
        try {
            await respondToCounter(resolvedParams.id, false);
            loadData();
        } catch (err) { alert("Failed to respond"); }
        finally { setIsResponding(false); }
    };

    const handleAcceptCounter = async () => {
        setIsResponding(true);
        try {
            await respondToCounter(resolvedParams.id, true);
            loadData();
        } catch (err) { alert("Failed to accept"); }
        finally { setIsResponding(false); }
    };

    const handleSubmitFeedback = async () => {
        setIsSubmittingFeedback(true);
        try {
            const result = await submitBuyerFeedback(resolvedParams.id, feedback);
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

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
    );

    if (!visit) return <div>Visit not found</div>;

    const isApproved = visit.status === VisitStatus.APPROVED;
    const isCheckedIn = visit.status === VisitStatus.CHECKED_IN;
    const isCompleted = visit.status === VisitStatus.COMPLETED;
    const canCancel = visit.status === VisitStatus.REQUESTED || visit.status === VisitStatus.APPROVED;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 pt-24 pb-20">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 mb-1">
                                Visit Request
                            </h1>
                            <p className="text-gray-500 text-sm">ID: {visit.id.slice(0, 8)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${visit.status === VisitStatus.APPROVED ? 'bg-green-100 text-green-800' :
                            visit.status === VisitStatus.CHECKED_IN ? 'bg-blue-100 text-blue-800' :
                                visit.status === VisitStatus.COMPLETED ? 'bg-emerald-100 text-emerald-800' :
                                    visit.status === VisitStatus.REJECTED ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                            }`}>
                            {visit.status === VisitStatus.CHECKED_IN ? 'In Progress' : visit.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 py-4 border-t border-b border-gray-100 mb-4">
                        {visit.property?.thumbnail_url && (
                            <img
                                src={visit.property.thumbnail_url}
                                className="w-16 h-16 rounded-lg object-cover"
                                alt="Property"
                            />
                        )}
                        <div>
                            <h2 className="font-semibold text-gray-900">{visit.property?.title}</h2>
                            <div className="flex items-center gap-1 text-gray-500 text-sm">
                                <MapPin className="w-3 h-3" />
                                {visit.property?.address}
                            </div>
                        </div>
                    </div>

                    {/* OTP Display - Show when visit is CHECKED_IN */}
                    {isCheckedIn && (
                        <div className="mb-6 p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Key className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Verification Code</h3>
                                    <p className="text-emerald-100 text-sm">Show this code to the agent</p>
                                </div>
                            </div>

                            {otpLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : otpError ? (
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <p className="text-sm text-emerald-100">{otpError}</p>
                                    <button
                                        onClick={fetchOTP}
                                        className="mt-2 px-4 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : otp ? (
                                <>
                                    <div className="text-center py-4">
                                        <div className="text-5xl font-mono font-bold tracking-[0.3em] mb-2">
                                            {otp.code}
                                        </div>
                                        <p className="text-emerald-100 text-sm">
                                            Expires: {format(new Date(otp.expires_at), "h:mm a")}
                                        </p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 text-center text-sm">
                                        The agent will ask for this code to verify your presence
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Scheduled Time</p>
                                <p className="font-medium text-gray-900">
                                    {visit.confirmed_date
                                        ? format(new Date(visit.confirmed_date), "EEEE, MMM d, yyyy 'at' h:mm a")
                                        : <span className="text-gray-400 italic">Pending confirmation (Pref: {format(new Date(visit.preferred_date), "MMM d")})</span>
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Agent Info - Only shown if approved */}
                        {(isApproved || isCheckedIn || isCompleted) && visit.agent && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Agent</p>
                                    <p className="font-medium text-gray-900">{visit.agent.full_name}</p>
                                    {visit.agent.phone_number && (
                                        <div className="flex items-center gap-2 mt-1 text-emerald-600">
                                            <Phone className="w-3 h-3" />
                                            <a href={`tel:${visit.agent.phone_number}`} className="text-sm hover:underline">
                                                {visit.agent.phone_number}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {visit.agent_notes && (
                            <div className="p-4 bg-gray-50 rounded-lg text-sm">
                                <span className="font-medium text-gray-900 block mb-1">Agent Notes:</span>
                                {visit.agent_notes}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="flex-1 py-3 border border-red-200 text-red-700 bg-red-50 rounded-xl font-medium hover:bg-red-100 disabled:opacity-50"
                            >
                                {isCancelling ? 'Cancelling...' : 'Cancel Visit'}
                            </button>
                        )}

                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.property?.address || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 flex items-center justify-center gap-2"
                        >
                            <Navigation className="w-4 h-4" />
                            Get Directions
                        </a>
                    </div>

                    {/* Negotiation UI */}
                    {(visit.status === VisitStatus.COUNTERED || visit.allowed_actions?.includes('accept_counter')) && (
                        <div className="mt-6 bg-amber-50 rounded-xl p-5 border border-amber-200">
                            <div className="mb-4">
                                <h3 className="text-amber-900 font-bold mb-1">
                                    {visit.allowed_actions?.includes('accept_counter') ? "Agent Proposed New Time" : "Counter Offer Sent"}
                                </h3>
                                <p className="text-amber-800 text-sm">
                                    Proposed: <span className="font-semibold">{visit.counter_date && format(new Date(visit.counter_date), "PPp")}</span>
                                </p>
                                {visit.counter_message && (
                                    <p className="text-amber-700 text-sm mt-1 bg-amber-100/50 p-2 rounded">
                                        "{visit.counter_message}"
                                    </p>
                                )}
                            </div>

                            {visit.allowed_actions?.includes('accept_counter') && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleRejectCounter}
                                        disabled={isResponding}
                                        className="flex-1 py-2 border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-50 text-sm"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => setShowCounterModal(true)}
                                        disabled={isResponding}
                                        className="flex-1 py-2 border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 text-sm"
                                    >
                                        Propose Other Time
                                    </button>
                                    <button
                                        onClick={handleAcceptCounter}
                                        disabled={isResponding}
                                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm"
                                    >
                                        Accept New Time
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Make Offer Section - Show for completed visits */}
                {isCompleted && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">Interested in this property?</h3>
                                <p className="text-gray-600 text-sm">Make an offer to start the purchase process</p>
                            </div>
                            <button
                                onClick={() => setShowOfferModal(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"
                            >
                                <DollarSign className="w-4 h-4" />
                                Make Offer
                            </button>
                        </div>
                    </div>
                )}

                {/* Feedback Section - Show for completed visits */}
                {isCompleted && !feedbackSubmitted && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Share Your Experience</h3>
                                <p className="text-gray-500 text-sm">Help us improve our service</p>
                            </div>
                        </div>

                        {!showFeedbackForm ? (
                            <button
                                onClick={() => setShowFeedbackForm(true)}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                            >
                                Leave Feedback
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <StarRating
                                    label="Overall Experience"
                                    value={feedback.overall_rating || 0}
                                    onChange={(v) => setFeedback({ ...feedback, overall_rating: v })}
                                />
                                <StarRating
                                    label="Agent Professionalism"
                                    value={feedback.agent_professionalism || 0}
                                    onChange={(v) => setFeedback({ ...feedback, agent_professionalism: v })}
                                />
                                <StarRating
                                    label="Property Condition"
                                    value={feedback.property_condition_rating || 0}
                                    onChange={(v) => setFeedback({ ...feedback, property_condition_rating: v })}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Was the property as described?
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFeedback({ ...feedback, property_as_described: true })}
                                            className={`flex-1 py-2 rounded-lg border ${feedback.property_as_described === true ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600'}`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFeedback({ ...feedback, property_as_described: false })}
                                            className={`flex-1 py-2 rounded-lg border ${feedback.property_as_described === false ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600'}`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Interest Level
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['HIGH', 'MEDIUM', 'LOW', 'NOT_INTERESTED'].map(level => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setFeedback({ ...feedback, interest_level: level as any })}
                                                className={`py-2 rounded-lg border text-sm ${feedback.interest_level === level ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                                            >
                                                {level.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        What did you like?
                                    </label>
                                    <textarea
                                        value={feedback.liked_aspects}
                                        onChange={(e) => setFeedback({ ...feedback, liked_aspects: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                                        rows={2}
                                        placeholder="Share what you liked about the property or visit..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Any concerns?
                                    </label>
                                    <textarea
                                        value={feedback.concerns}
                                        onChange={(e) => setFeedback({ ...feedback, concerns: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                                        rows={2}
                                        placeholder="Share any concerns or issues..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowFeedbackForm(false)}
                                        className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={isSubmittingFeedback}
                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Feedback Submitted */}
                {feedbackSubmitted && (
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 flex items-center gap-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                        <div>
                            <h3 className="font-bold text-emerald-900">Thank you for your feedback!</h3>
                            <p className="text-emerald-700 text-sm">Your feedback helps us improve our service.</p>
                        </div>
                    </div>
                )}
            </main>

            <CounterVisitModal
                isOpen={showCounterModal}
                onClose={() => setShowCounterModal(false)}
                onSuccess={loadData}
                visitId={visit.id}
                propertyTitle={visit.property?.title || 'Property'}
            />

            <MakeOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onSuccess={() => {
                    alert('Offer submitted successfully! The agent will review it.');
                    router.push('/offers');
                }}
                propertyId={visit.property_id}
                propertyTitle={visit.property?.title || 'Property'}
                propertyPrice={(visit.property as any)?.price || 0}
                visitId={visit.id}
            />
        </div>
    );
}
