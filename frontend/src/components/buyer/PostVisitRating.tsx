'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle2, ThumbsUp, ThumbsDown, Home, Loader2 } from 'lucide-react';
import { submitBuyerFeedback } from '@/lib/api/visits';
import { BuyerFeedbackData } from '@/lib/types/visit';
import { useToast } from '@/components/ui/Toast';

interface PostVisitRatingProps {
    visitId: string;
    propertyTitle: string;
    propertyAddress: string;
    onSubmit?: (rating: VisitRating) => void;
}

export interface VisitRating {
    overallRating: number;
    wouldRevisit: boolean;
    propertyCondition: number;
    neighborhoodImpression: number;
    agentExperience: number;
    notes: string;
}

export default function PostVisitRating({
    visitId,
    propertyTitle,
    propertyAddress,
    onSubmit
}: PostVisitRatingProps) {
    const [rating, setRating] = useState<VisitRating>({
        overallRating: 0,
        wouldRevisit: false,
        propertyCondition: 0,
        neighborhoodImpression: 0,
        agentExperience: 0,
        notes: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        if (rating.overallRating === 0) {
            showToast('Please provide an overall rating', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Map frontend fields to backend schema
            const backendFeedback: BuyerFeedbackData = {
                overall_rating: rating.overallRating,
                agent_professionalism: rating.agentExperience,
                property_condition_rating: rating.propertyCondition,
                // Derive interest_level from rating and wouldRevisit
                interest_level:
                    rating.overallRating >= 4 && rating.wouldRevisit ? 'HIGH' :
                        rating.overallRating >= 3 ? 'MEDIUM' :
                            rating.overallRating === 1 && !rating.wouldRevisit ? 'NOT_INTERESTED' :
                                'LOW',
                // Combine all notes into liked_aspects
                liked_aspects: `${rating.notes}\n\nNeighborhood Rating: ${rating.neighborhoodImpression}/5\nWould Revisit: ${rating.wouldRevisit ? 'Yes' : 'No'}`,
                would_recommend: rating.wouldRevisit && rating.overallRating >= 4
            };

            const result = await submitBuyerFeedback(visitId, backendFeedback);

            if (result.success) {
                setSubmitted(true);
                showToast('Feedback submitted successfully!', 'success');
                onSubmit?.(rating);
            } else {
                throw new Error(result.error || 'Failed to submit feedback');
            }
        } catch (error: any) {
            console.error('Submit feedback error:', error);
            showToast(error.message || 'Failed to submit feedback', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const StarRating = ({
        label,
        value,
        onChange
    }: {
        label: string;
        value: number;
        onChange: (val: number) => void;
    }) => {
        const [hover, setHover] = useState(0);

        return (
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                            key={star}
                            type="button"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => onChange(star)}
                            className="focus:outline-none"
                        >
                            <Star
                                className={`w-8 h-8 transition-colors ${star <= (hover || value)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                    }`}
                            />
                        </motion.button>
                    ))}
                    {value > 0 && (
                        <span className="ml-2 text-sm text-gray-600 self-center">
                            {value === 5 ? 'Excellent' : value === 4 ? 'Good' : value === 3 ? 'Average' : value === 2 ? 'Below Average' : 'Poor'}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 text-center"
            >
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Thank You! 🎉</h3>
                <p className="text-gray-600 mb-6">
                    Your feedback has been saved. Use your notes to compare properties and make informed decisions!
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                    Edit Rating
                </button>
            </motion.div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <Home className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Post-Visit Rating</h3>
                        <p className="text-sm text-gray-600">{propertyTitle}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500">{propertyAddress}</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                {/* Overall Rating */}
                <StarRating
                    label="Overall Experience *"
                    value={rating.overallRating}
                    onChange={(val) => setRating({ ...rating, overallRating: val })}
                />

                {/* Would Revisit */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Would you like to revisit this property?
                    </label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setRating({ ...rating, wouldRevisit: true })}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${rating.wouldRevisit
                                ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <ThumbsUp className="w-5 h-5" />
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => setRating({ ...rating, wouldRevisit: false })}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${!rating.wouldRevisit && rating.overallRating > 0
                                ? 'bg-red-500 text-white ring-2 ring-red-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <ThumbsDown className="w-5 h-5" />
                            No
                        </button>
                    </div>
                </div>

                {/* Property Condition */}
                <StarRating
                    label="Property Condition"
                    value={rating.propertyCondition}
                    onChange={(val) => setRating({ ...rating, propertyCondition: val })}
                />

                {/* Neighborhood */}
                <StarRating
                    label="Neighborhood Impression"
                    value={rating.neighborhoodImpression}
                    onChange={(val) => setRating({ ...rating, neighborhoodImpression: val })}
                />

                {/* Agent Experience */}
                <StarRating
                    label="Agent Experience"
                    value={rating.agentExperience}
                    onChange={(val) => setRating({ ...rating, agentExperience: val })}
                />

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Additional Notes & Observations
                    </label>
                    <textarea
                        value={rating.notes}
                        onChange={(e) => setRating({ ...rating, notes: e.target.value })}
                        rows={4}
                        placeholder="What did you like? Any concerns? What stood out to you?"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Pro tip: Note any repairs needed, impressive features, or questions to follow up on
                    </p>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={rating.overallRating === 0 || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Save Rating & Notes
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
