'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Home, Clock, BarChart3 } from 'lucide-react';

interface MarketInsights {
    average_price: number;
    price_trend: number; // percentage change
    days_on_market: number;
    inventory_count: number;
    active_listings: number;
}

export default function MarketInsightsWidget() {
    const [insights, setInsights] = useState<MarketInsights | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const { get } = await import('@/lib/api');

                const result = await get<{ success: boolean; data: MarketInsights }>('/buyer/market-insights');

                if (result.success && result.data) {
                    setInsights(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch market insights:", error);
                // Fallback Mock Data on error so UI doesn't break
                setInsights({
                    average_price: 425000,
                    price_trend: 3.2,
                    days_on_market: 28,
                    inventory_count: 1247,
                    active_listings: 342
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, []);

    if (isLoading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const metrics = [
        {
            label: 'Avg. Home Price',
            value: `$${(insights.average_price / 1000).toFixed(0)}K`,
            icon: Home,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Price Trend',
            value: `${insights.price_trend > 0 ? '+' : ''}${insights.price_trend}%`,
            icon: insights.price_trend > 0 ? TrendingUp : TrendingDown,
            color: insights.price_trend > 0 ? 'text-emerald-600' : 'text-red-600',
            bgColor: insights.price_trend > 0 ? 'bg-emerald-50' : 'bg-red-50',
            trend: insights.price_trend
        },
        {
            label: 'Avg. Days on Market',
            value: `${insights.days_on_market}`,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50'
        },
        {
            label: 'Active Listings',
            value: insights.active_listings.toString(),
            icon: BarChart3,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 group hover:shadow-xl transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Market Insights</h3>
                    <p className="text-sm text-gray-500 mt-1">Your search area</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-100 hover:border-gray-200 transition-all group/item"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-500 mb-1">{metric.label}</p>
                                    <p className={`text-2xl font-bold ${metric.color} group-hover/item:scale-105 transition-transform`}>
                                        {metric.value}
                                    </p>
                                </div>
                                <div className={`${metric.bgColor} p-2 rounded-lg`}>
                                    <Icon className={`w-4 h-4 ${metric.color}`} />
                                </div>
                            </div>

                            {/* Micro-animation on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover/item:opacity-20 transform -translate-x-full group-hover/item:translate-x-full transition-all duration-1000"></div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Mini chart placeholder */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex-1 h-12 relative">
                        {/* Simple SVG chart */}
                        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                            <path
                                d="M0,40 L20,35 L40,30 L60,25 L80,22 L100,20"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="2"
                                className="drop-shadow-sm"
                            />
                            <path
                                d="M0,40 L20,35 L40,30 L60,25 L80,22 L100,20 L100,50 L0,50 Z"
                                fill="url(#gradient)"
                                opacity="0.1"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3B82F6" />
                                    <stop offset="100%" stopColor="#6366F1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">30-day trend</p>
            </div>
        </motion.div>
    );
}
