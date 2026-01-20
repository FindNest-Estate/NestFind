'use client';

import { motion } from 'framer-motion';
import { Clock, MessageSquare, DollarSign, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface NegotiationEvent {
    id: string;
    type: 'offer' | 'counter' | '  accepted' | 'rejected' | 'message' | 'status_change';
    title: string;
    description: string;
    amount?: number;
    timestamp: string;
    author: 'buyer' | 'seller' | 'system';
}

interface NegotiationTimelineProps {
    events: NegotiationEvent[];
    currentStatus: 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
}

export default function NegotiationTimeline({ events, currentStatus }: NegotiationTimelineProps) {
    const getEventIcon = (type: NegotiationEvent['type']) => {
        switch (type) {
            case 'offer': return DollarSign;
            case 'counter': return ArrowRight;
            case 'accepted': return CheckCircle2;
            case 'rejected': return XCircle;
            case 'message': return MessageSquare;
            default: return AlertCircle;
        }
    };

    const getEventColor = (type: NegotiationEvent['type'], author: NegotiationEvent['author']) => {
        if (type === 'accepted') return { bg: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', light: 'bg-emerald-50' };
        if (type === 'rejected') return { bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700', light: 'bg-red-50' };
        if (author === 'buyer') return { bg: 'bg-blue-500', ring: 'ring-blue-200', text: 'text-blue-700', light: 'bg-blue-50' };
        if (author === 'seller') return { bg: 'bg-purple-500', ring: 'ring-purple-200', text: 'text-purple-700', light: 'bg-purple-50' };
        return { bg: 'bg-gray-500', ring: 'ring-gray-200', text: 'text-gray-700', light: 'bg-gray-50' };
    };

    const formatAmount = (amount: number) => {
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
        return `$${amount.toLocaleString()}`;
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Negotiation Timeline</h3>
                        <p className="text-sm text-gray-500">{events.length} events</p>
                    </div>
                </div>
                {/* <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    currentStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                    currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN' ? 'bg-red-100 text-red-700' :
                    currentStatus === 'COUNTERED' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                }`}>
                    {currentStatus.replace('_', ' ')}
                </span> */}
            </div>

            {/* Timeline */}
            <div className="relative">
                {events.map((event, index) => {
                    const Icon = getEventIcon(event.type);
                    const colors = getEventColor(event.type, event.author);
                    const isLast = index === events.length - 1;

                    return (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative pl-12 pb-8 last:pb-0"
                        >
                            {/* Timeline line */}
                            {!isLast && (
                                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 to-transparent" />
                            )}

                            {/* Icon */}
                            <div className={`absolute left-0 top-0 w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center shadow-lg ring-4 ${colors.ring}`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>

                            {/* Content */}
                            <div className={`${colors.light} rounded-xl p-4 border-2 border-${colors.bg.replace('bg-', '') - 100}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className={`font-bold ${colors.text} text-lg`}>{event.title}</h4>
                                        {event.amount && (
                                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                                {formatAmount(event.amount)}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {formatTimestamp(event.timestamp)}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">{event.description}</p>

                                {/* Author badge */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${event.author === 'buyer' ? 'bg-blue-100 text-blue-700' :
                                            event.author === 'seller' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {event.author === 'buyer' ? '👤 You' :
                                            event.author === 'seller' ? '🏠 Seller' :
                                                '🤖 System'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Next Steps (if pending/countered) */}
            {(currentStatus === 'PENDING' || currentStatus === 'COUNTERED') && (
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-900 mb-1">Awaiting Response</p>
                            <p className="text-sm text-amber-700">
                                {currentStatus === 'PENDING'
                                    ? 'The seller is reviewing your offer. You\'ll be notified when they respond.'
                                    : 'The seller has countered your offer. Review their terms and respond soon.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
