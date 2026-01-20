'use client';

import React, { useEffect, useState } from 'react';
import { getSellerDashboardStats, getSellerGlobalActivity, SellerPortfolioStats, BuyerActivity } from '@/lib/api/seller';
import Link from 'next/link';
import {
    Plus,
    ArrowRight,
    ArrowUpRight,
    ArrowDownRight,
    Home,
    Eye,
    Heart,
    MessageCircle,
    Calendar,
    IndianRupee,
    TrendingUp,
    ShoppingBag,
    Users,
    Target,
    AlertCircle,
    CheckCircle,
    Clock
} from 'lucide-react';

interface StatCard {
    title: string;
    value: number | string;
    suffix?: string;
    icon: React.ElementType;
    trend?: number;
    color: string;
    bgColor: string;
}

const activityIcons: Record<string, React.ElementType> = {
    'view': Eye,
    'save': Heart,
    'inquiry': MessageCircle,
    'visit': Calendar,
    'offer': IndianRupee,
    'reservation': ShoppingBag,
    'sold': CheckCircle
};

export default function SellDashboardPage() {
    const [stats, setStats] = useState<SellerPortfolioStats | null>(null);
    const [activities, setActivities] = useState<BuyerActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadDashboardData() {
            try {
                const [statsData, activityData] = await Promise.all([
                    getSellerDashboardStats(),
                    getSellerGlobalActivity(10)
                ]);
                setStats(statsData);
                setActivities(activityData.activities || []);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
                setError("Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        }
        loadDashboardData();
    }, []);

    const statCards: StatCard[] = stats ? [
        {
            title: 'Active Listings',
            value: stats.active_listings,
            icon: Home,
            color: 'text-[#ff385c]',
            bgColor: 'bg-rose-50'
        },
        {
            title: 'Total Views',
            value: stats.total_views,
            icon: Eye,
            trend: 12,
            color: 'text-slate-700',
            bgColor: 'bg-slate-50'
        },
        {
            title: 'Property Visits',
            value: stats.total_visits,
            icon: Users,
            trend: 5,
            color: 'text-slate-700',
            bgColor: 'bg-slate-50'
        },
        {
            title: 'Deals Closed',
            value: stats.deals_closed,
            icon: Target,
            color: 'text-[#ff385c]',
            bgColor: 'bg-rose-50'
        },
        {
            title: 'Conversion Rate',
            value: stats.conversion_rate,
            suffix: '%',
            icon: TrendingUp,
            color: 'text-slate-700',
            bgColor: 'bg-slate-50'
        },
        {
            title: 'Total Properties',
            value: stats.total_properties,
            icon: ShoppingBag,
            color: 'text-slate-700',
            bgColor: 'bg-slate-50'
        }
    ] : [];

    // Loading Skeleton
    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white/50 rounded-2xl p-5 h-32" />
                    ))}
                </div>

                {/* Main Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white/50 rounded-3xl h-48" />
                        <div className="bg-white/50 rounded-2xl h-64" />
                    </div>
                    <div className="bg-white/50 rounded-2xl h-96" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
                        Welcome back! 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Here&apos;s what&apos;s happening with your properties today.
                    </p>
                </div>
                <span className="hidden md:inline-flex items-center px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200/50 text-sm text-slate-500">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    Last 30 Days
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.title}
                            className={`
                                relative overflow-hidden bg-white
                                rounded-xl p-5 border border-slate-100 shadow-sm
                                hover:border-slate-300 hover:shadow-md transition-all duration-200
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                {stat.trend !== undefined && (
                                    <div className={`flex items-center gap-0.5 text-xs font-semibold ${stat.trend >= 0 ? 'text-slate-700' : 'text-slate-500'}`}>
                                        {stat.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(stat.trend)}%
                                    </div>
                                )}
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-bold text-slate-800">
                                    {stat.value}{stat.suffix}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 truncate">{stat.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* CTA Banner */}
                    <section className="relative bg-[#ff385c] rounded-2xl p-8 text-white shadow-lg overflow-hidden group">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    List another property
                                </h2>
                                <p className="text-white/90 max-w-md">
                                    Ready to expand your portfolio? Create a new listing and connect with more buyers.
                                </p>
                            </div>
                            <Link
                                href="/sell/create"
                                className="whitespace-nowrap inline-flex items-center px-6 py-3 bg-white text-[#ff385c] rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                New Listing
                            </Link>
                        </div>
                    </section>

                    {/* Quick Stats / Pending Actions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                Properties Requiring Attention
                            </h2>
                            <Link href="/sell/dashboard/listings" className="text-sm text-[#ff385c] hover:text-[#d9324e] font-medium flex items-center gap-1">
                                View All <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {stats?.pending_actions && stats.pending_actions > 0 ? (
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
                                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="p-3 bg-amber-100 rounded-xl">
                                        <Clock className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-amber-800">
                                            {stats.pending_actions} {stats.pending_actions === 1 ? 'property' : 'properties'} pending action
                                        </p>
                                        <p className="text-sm text-amber-600">
                                            Complete the setup to make them visible to buyers
                                        </p>
                                    </div>
                                    <Link
                                        href="/sell/dashboard/listings"
                                        className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                                    >
                                        Review
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-900 font-medium">All good!</p>
                                <p className="text-sm text-slate-500 mt-1">You have no pending actions.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-900">Activity</h2>
                            <Link href="/sell/dashboard/analytics" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                                View All
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Clock className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 text-sm">No recent activity</p>
                                    <p className="text-slate-400 text-xs mt-1">Activities will appear here</p>
                                </div>
                            ) : (
                                activities.map((activity, index) => {
                                    const Icon = activityIcons[activity.type] || Eye;
                                    const bgColors: Record<string, string> = {
                                        'view': 'bg-blue-50 text-blue-600',
                                        'save': 'bg-rose-50 text-[#ff385c]',
                                        'inquiry': 'bg-purple-50 text-purple-600',
                                        'visit': 'bg-orange-50 text-orange-600',
                                        'offer': 'bg-slate-100 text-slate-700'
                                    };

                                    return (
                                        <div
                                            key={index}
                                            className="px-6 py-4 hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${bgColors[activity.type] || 'bg-slate-100 text-slate-600'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700 font-medium line-clamp-2">
                                                        {activity.title}
                                                    </p>
                                                    {activity.property_title && (
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">
                                                            {activity.property_title}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {activity.relative_time}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {activities.length > 0 && (
                            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                                <Link
                                    href="/sell/dashboard/analytics"
                                    className="text-sm text-[#ff385c] hover:text-[#d9324e] font-medium flex items-center justify-center gap-1"
                                >
                                    View All Activity <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
