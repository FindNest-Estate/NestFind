'use client';

import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle2, Zap, DollarSign, Users, Clock, Target } from 'lucide-react';

interface OfferStrengthData {
    score: number; // 0-100
    factors: {
        name: string;
        impact: 'positive' | 'negative' | 'neutral';
        description: string;
        icon: any;
    }[];
    recommendation: string;
    competitiveness: 'weak' | 'moderate' | 'strong' | 'excellent';
}

interface OfferStrengthIndicatorProps {
    offerAmount: number;
    listingPrice: number;
    marketAverage?: number;
    downPayment?: number;
    hasContingencies?: boolean;
    closingTimeline?: number; // days
    competingOffers?: number;
}

export default function OfferStrengthIndicator({
    offerAmount,
    listingPrice,
    marketAverage,
    downPayment = 0,
    hasContingencies = true,
    closingTimeline = 30,
    competingOffers = 0
}: OfferStrengthIndicatorProps) {
    // Calculate offer strength
    const calculateStrength = (): OfferStrengthData => {
        let score = 50; // Base score
        const factors: OfferStrengthData['factors'] = [];

        // Price comparison
        const priceRatio = (offerAmount / listingPrice) * 100;
        if (priceRatio >= 100) {
            score += 20;
            factors.push({
                name: 'Competitive Price',
                impact: 'positive',
                description: `Offer is ${priceRatio.toFixed(1)}% of asking price`,
                icon: DollarSign
            });
        } else if (priceRatio >= 95) {
            score += 10;
            factors.push({
                name: 'Fair Price',
                impact: 'neutral',
                description: `Offer is ${priceRatio.toFixed(1)}% of asking price`,
                icon: DollarSign
            });
        } else {
            score -= 10;
            factors.push({
                name: 'Below Asking',
                impact: 'negative',
                description: `Offer is ${priceRatio.toFixed(1)}% of asking price`,
                icon: DollarSign
            });
        }

        // Down payment
        const downPaymentPercent = (downPayment / offerAmount) * 100;
        if (downPaymentPercent >= 20) {
            score += 15;
            factors.push({
                name: 'Strong Down Payment',
                impact: 'positive',
                description: `${downPaymentPercent.toFixed(0)}% down payment shows financial strength`,
                icon: Target
            });
        } else if (downPaymentPercent >= 10) {
            score += 5;
            factors.push({
                name: 'Moderate Down Payment',
                impact: 'neutral',
                description: `${downPaymentPercent.toFixed(0)}% down payment`,
                icon: Target
            });
        }

        // Contingencies
        if (!hasContingencies) {
            score += 15;
            factors.push({
                name: 'No Contingencies',
                impact: 'positive',
                description: 'Makes offer more attractive to sellers',
                icon: Zap
            });
        } else {
            score -= 5;
            factors.push({
                name: 'Has Contingencies',
                impact: 'negative',
                description: 'May reduce appeal to sellers',
                icon: AlertTriangle
            });
        }

        // Closing timeline
        if (closingTimeline <= 21) {
            score += 10;
            factors.push({
                name: 'Quick Close',
                impact: 'positive',
                description: `${closingTimeline} days to close`,
                icon: Clock
            });
        } else if (closingTimeline > 45) {
            score -= 5;
            factors.push({
                name: 'Extended Timeline',
                impact: 'negative',
                description: `${closingTimeline} days to close`,
                icon: Clock
            });
        }

        // Competition
        if (competingOffers > 0) {
            score -= competingOffers * 3;
            factors.push({
                name: 'Competition',
                impact: 'negative',
                description: `${competingOffers} other ${competingOffers === 1 ? 'offer' : 'offers'} on this property`,
                icon: Users
            });
        }

        // Determine competitiveness
        let competitiveness: OfferStrengthData['competitiveness'];
        let recommendation: string;

        if (score >= 80) {
            competitiveness = 'excellent';
            recommendation = 'Your offer is highly competitive and has a strong chance of acceptance!';
        } else if (score >= 65) {
            competitiveness = 'strong';
            recommendation = 'Your offer is solid and likely to be well-received by the seller.';
        } else if (score >= 50) {
            competitiveness = 'moderate';
            recommendation = 'Your offer is fair but may benefit from improvements to stand out.';
        } else {
            competitiveness = 'weak';
            recommendation = 'Consider strengthening your offer to improve chances of acceptance.';
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            factors,
            recommendation,
            competitiveness
        };
    };

    const strengthData = calculateStrength();

    const getScoreColor = () => {
        if (strengthData.score >= 80) return { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', ring: 'ring-emerald-500' };
        if (strengthData.score >= 65) return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-600', ring: 'ring-blue-500' };
        if (strengthData.score >= 50) return { bg: 'from-amber-500 to-orange-600', text: 'text-amber-600', ring: 'ring-amber-500' };
        return { bg: 'from-red-500 to-rose-600', text: 'text-red-600', ring: 'ring-red-500' };
    };

    const colors = getScoreColor();

    const getCompetitivenessLabel = () => {
        switch (strengthData.competitiveness) {
            case 'excellent': return '🔥 Excellent';
            case 'strong': return '💪 Strong';
            case 'moderate': return '👍 Moderate';
            case 'weak': return '⚠️ Weak';
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg`}>
                    <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Offer Strength Analysis</h3>
                    <p className="text-sm text-gray-500">Based on market data and offer details</p>
                </div>
            </div>

            {/* Score Circle */}
            <div className="flex items-center justify-center mb-8">
                <div className="relative">
                    <svg className="w-48 h-48 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="#E5E7EB"
                            strokeWidth="12"
                            fill="none"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 553 }}
                            animate={{ strokeDashoffset: 553 - (553 * strengthData.score) / 100 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ strokeDasharray: 553 }}
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" className={colors.bg.includes('emerald') ? 'text-emerald-500' : colors.bg.includes('blue') ? 'text-blue-500' : colors.bg.includes('amber') ? 'text-amber-500' : 'text-red-500'} stopColor="currentColor" />
                                <stop offset="100%" className={colors.bg.includes('emerald') ? 'text-teal-600' : colors.bg.includes('blue') ? 'text-indigo-600' : colors.bg.includes('amber') ? 'text-orange-600' : 'text-rose-600'} stopColor="currentColor" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-center"
                        >
                            <div className={`text-5xl font-bold ${colors.text} mb-1`}>
                                {Math.round(strengthData.score)}
                            </div>
                            <div className="text-sm font-semibold text-gray-600">
                                {getCompetitivenessLabel()}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Recommendation */}
            <div className={`p-4 rounded-xl bg-gradient-to-r ${colors.bg} bg-opacity-10 border-2 ${colors.ring} border-opacity-30 mb-6`}>
                <div className="flex items-start gap-3">
                    <CheckCircle2 className={`w-6 h-6 ${colors.text} flex-shrink-0 mt-0.5`} />
                    <p className="text-gray-700 font-medium">{strengthData.recommendation}</p>
                </div>
            </div>

            {/* Factors */}
            <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Strength Factors</h4>
                <div className="space-y-3">
                    {strengthData.factors.map((factor, index) => {
                        const Icon = factor.icon;
                        const impactColors = {
                            positive: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
                            negative: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
                            neutral: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' }
                        };
                        const impact = impactColors[factor.impact];

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-4 rounded-xl ${impact.bg} border border-${factor.impact === 'positive' ? 'emerald' : factor.impact === 'negative' ? 'red' : 'blue'}-100`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 ${impact.icon}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${impact.text} mb-1`}>{factor.name}</p>
                                        <p className="text-sm text-gray-600">{factor.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Market Context */}
            {marketAverage && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3">Market Context</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Your Offer</p>
                            <p className="text-xl font-bold text-gray-900">
                                ${(offerAmount / 1000).toFixed(0)}K
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">List Price</p>
                            <p className="text-xl font-bold text-gray-900">
                                ${(listingPrice / 1000).toFixed(0)}K
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600 mb-1">Market Avg</p>
                            <p className="text-xl font-bold text-gray-900">
                                ${(marketAverage / 1000).toFixed(0)}K
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
