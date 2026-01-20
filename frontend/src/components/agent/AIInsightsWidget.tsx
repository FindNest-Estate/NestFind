'use client';

import React, { useState } from 'react';
import {
    Sparkles,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    ChevronRight,
    Users,
    Home,
    Clock,
    Target,
    Zap
} from 'lucide-react';

export interface AIInsight {
    id: string;
    type: 'opportunity' | 'warning' | 'tip' | 'prediction';
    title: string;
    description: string;
    action: string;
    actionUrl?: string;
    priority: 'high' | 'medium' | 'low';
    icon?: string;
    metric?: {
        value: string;
        label: string;
        trend?: 'up' | 'down' | 'neutral';
    };
}

interface AIInsightsWidgetProps {
    insights: AIInsight[];
    onActionClick?: (insight: AIInsight) => void;
    isLoading?: boolean;
}

const INSIGHT_STYLES = {
    opportunity: {
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        icon: TrendingUp,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-100'
    },
    warning: {
        bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
        border: 'border-amber-200',
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100'
    },
    tip: {
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        icon: Lightbulb,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100'
    },
    prediction: {
        bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
        border: 'border-purple-200',
        icon: Sparkles,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-100'
    }
};

function InsightCard({ insight, onAction }: { insight: AIInsight; onAction?: () => void }) {
    const style = INSIGHT_STYLES[insight.type];
    const Icon = style.icon;

    return (
        <div
            className={`group p-4 rounded-xl border ${style.bg} ${style.border} transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer`}
            onClick={onAction}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${style.iconBg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${style.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                        {insight.priority === 'high' && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                                URGENT
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.description}</p>

                    {insight.metric && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-white/60 px-2 py-1 rounded-lg">
                            <span className="text-lg font-bold text-gray-900">{insight.metric.value}</span>
                            <span className="text-xs text-gray-500">{insight.metric.label}</span>
                            {insight.metric.trend && (
                                <TrendingUp className={`w-3 h-3 ${insight.metric.trend === 'up' ? 'text-emerald-500' :
                                        insight.metric.trend === 'down' ? 'text-red-500 rotate-180' :
                                            'text-gray-400'
                                    }`} />
                            )}
                        </div>
                    )}

                    <button className="mt-2 text-xs font-semibold flex items-center gap-1 text-gray-700 group-hover:text-rose-600 transition-colors">
                        {insight.action}
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AIInsightsWidget({ insights, onActionClick, isLoading }: AIInsightsWidgetProps) {
    const [filter, setFilter] = useState<'all' | 'opportunity' | 'warning' | 'prediction'>('all');

    const filteredInsights = filter === 'all'
        ? insights
        : insights.filter(i => i.type === filter);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-purple-500 animate-pulse" />
                    <span className="font-semibold text-gray-900">AI Analyzing...</span>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">AI Insights</h3>
                            <p className="text-xs text-gray-500">Personalized recommendations</p>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {insights.length} new
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100">
                {(['all', 'opportunity', 'warning', 'prediction'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Insights List */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredInsights.length > 0 ? (
                    filteredInsights.map((insight) => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onAction={() => onActionClick?.(insight)}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No insights in this category
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button className="w-full text-center text-xs font-medium text-gray-500 hover:text-rose-600 transition-colors">
                    View All Insights →
                </button>
            </div>
        </div>
    );
}

// Generate mock insights based on real agent data
export function generateInsights(data: {
    pendingLeads: number;
    daysWithoutContact: { name: string; days: number }[];
    hotProperties: { title: string; views: number }[];
    conversionRate: number;
    avgResponseTime: number;
}): AIInsight[] {
    const insights: AIInsight[] = [];

    // Follow-up warnings
    data.daysWithoutContact.forEach((lead, i) => {
        if (lead.days >= 3) {
            insights.push({
                id: `followup-${i}`,
                type: 'warning',
                title: `Follow up with ${lead.name}`,
                description: `No contact in ${lead.days} days. Hot leads need attention within 24 hours for best conversion.`,
                action: 'Send Message',
                priority: lead.days >= 7 ? 'high' : 'medium',
                metric: {
                    value: `${lead.days}d`,
                    label: 'since last contact'
                }
            });
        }
    });

    // Hot property opportunities
    data.hotProperties.forEach((prop, i) => {
        insights.push({
            id: `property-${i}`,
            type: 'opportunity',
            title: `High interest in ${prop.title}`,
            description: `This property has ${prop.views} views this week. Schedule more showings to capitalize.`,
            action: 'Schedule Showings',
            priority: 'medium',
            metric: {
                value: `${prop.views}`,
                label: 'views this week',
                trend: 'up'
            }
        });
    });

    // Performance tips
    if (data.avgResponseTime > 2) {
        insights.push({
            id: 'response-time',
            type: 'tip',
            title: 'Improve Response Time',
            description: `Your average response time is ${data.avgResponseTime.toFixed(1)} hours. Top agents respond within 1 hour.`,
            action: 'View Best Practices',
            priority: 'low',
            metric: {
                value: `${data.avgResponseTime.toFixed(1)}h`,
                label: 'avg response',
                trend: 'down'
            }
        });
    }

    // Predictions
    if (data.pendingLeads > 0) {
        insights.push({
            id: 'conversion-prediction',
            type: 'prediction',
            title: 'Likely to Close This Month',
            description: `Based on your pipeline, AI predicts ${Math.ceil(data.pendingLeads * (data.conversionRate / 100))} deals will close this month.`,
            action: 'View Pipeline',
            priority: 'medium',
            metric: {
                value: `${Math.ceil(data.pendingLeads * (data.conversionRate / 100))}`,
                label: 'predicted closes'
            }
        });
    }

    return insights;
}
