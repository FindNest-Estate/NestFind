'use client';

import React from 'react';
import { Eye, BarChart2, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

interface SellerPortfolioStats {
    active_listings: number;
    total_views: number;
    total_visits: number;
    deals_closed: number;
    conversion_rate: number;
}

interface SellerStatsProps {
    stats: SellerPortfolioStats | null;
    isLoading: boolean;
}

export default function SellerStats({ stats, isLoading }: SellerStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-2xl bg-white/50 animate-pulse border border-white/20" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const cards = [
        {
            label: 'Total Views',
            value: stats.total_views.toLocaleString(),
            icon: Eye,
            color: 'text-blue-600',
            bg: 'bg-blue-100/50',
            trend: '+12% this week', // Mock trend for now
            trendUp: true
        },
        {
            label: 'Visits Requested',
            value: stats.total_visits.toLocaleString(),
            icon: Calendar,
            color: 'text-purple-600',
            bg: 'bg-purple-100/50',
            trend: 'Pending approval',
            trendUp: true
        },
        {
            label: 'Active Listings',
            value: stats.active_listings,
            icon: Users, // Using Users as a placeholder for "Active public exposure"
            color: 'text-emerald-600',
            bg: 'bg-emerald-100/50',
            trend: 'In 3 cities',
            trendUp: true
        },
        {
            label: 'Conversion Rate',
            value: `${stats.conversion_rate}%`,
            icon: TrendingUp,
            color: 'text-amber-600',
            bg: 'bg-amber-100/50',
            trend: 'Visits to Deals',
            trendUp: true
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="relative overflow-hidden p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                        {card.trend && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {card.trend}
                            </span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
                        <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    </div>

                    {/* Decorative gradient blob */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-gray-200/50 to-transparent rounded-full blur-2xl opacity-50 pointer-events-none" />
                </div>
            ))}
        </div>
    );
}
