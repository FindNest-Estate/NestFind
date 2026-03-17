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
    Activity,
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
            color: 'text-slate-800',
            bgColor: 'bg-slate-100/50'
        },
        {
            title: 'Property Visits',
            value: stats.total_visits,
            icon: Users,
            color: 'text-slate-800',
            bgColor: 'bg-slate-100/50'
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
            color: 'text-slate-800',
            bgColor: 'bg-slate-100/50'
        },
        {
            title: 'Total Properties',
            value: stats.total_properties,
            icon: ShoppingBag,
            color: 'text-slate-800',
            bgColor: 'bg-slate-100/50'
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        Welcome back! <span className="text-3xl">👋</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">
                        Here&apos;s what&apos;s happening with your properties today.
                    </p>
                </div>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl border border-gray-100 shadow-sm text-sm font-bold text-gray-600">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Last 30 Days
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.title}
                            className="bg-white/90 backdrop-blur-lg rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-gray-50 rounded-full blur-2xl opacity-60 group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-2.5 rounded-xl ${stat.bgColor} flex items-center justify-center transform group-hover:scale-110 transition-transform`}>
                                        <Icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                    {stat.trend !== undefined && (
                                        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${stat.trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            {stat.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {Math.abs(stat.trend)}%
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">
                                        {stat.value}{stat.suffix}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{stat.title}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* CTA Banner */}
                    <section className="relative bg-gradient-to-r from-[#FF385C] via-rose-500 to-orange-500 rounded-3xl p-8 shadow-lg overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10">
                            <Home className="w-48 h-48 text-white scale-125 group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-bold !text-white mb-2 tracking-tight">
                                    List another property
                                </h2>
                                <p className="text-sm font-medium !text-white max-w-md leading-relaxed">
                                    Ready to expand your portfolio? Create a new listing and connect with more buyers on NestFind.
                                </p>
                            </div>
                            <Link
                                href="/sell/create"
                                className="whitespace-nowrap inline-flex items-center px-6 py-3 bg-gray-900 border border-gray-800 text-white !text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5 mr-2 text-white" />
                                <span className="text-white">New Listing</span>
                            </Link>
                        </div>
                    </section>

                    {/* Quick Stats / Pending Actions */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                Properties Requiring Attention
                            </h2>
                            <Link href="/sell/dashboard/listings" className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                                View All <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {stats?.pending_actions && stats.pending_actions > 0 ? (
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-amber-200 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/50" />
                                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-amber-100 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-sm">
                                            {stats.pending_actions} {stats.pending_actions === 1 ? 'property' : 'properties'} pending action
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                                            Complete the setup to make them visible to buyers
                                        </p>
                                    </div>
                                    <Link
                                        href="/sell/dashboard/listings"
                                        className="sm:shrink-0 w-full sm:w-auto px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm text-center"
                                    >
                                        Review Action
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 p-8 shadow-sm text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/30 to-teal-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200/50 group-hover:scale-110 transition-transform">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-gray-900 font-bold text-lg">All caught up!</p>
                                <p className="text-sm text-gray-500 font-medium mt-1">You have no pending actions on your properties.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-1">
                    <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col group hover:shadow-md transition-shadow">
                        <div className="px-6 py-5 border-b border-gray-100/60 flex items-center justify-between bg-white/50">
                            <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gray-400" />
                                Activity
                            </h2>
                            <Link href="/sell/dashboard/analytics" className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                                View All
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-100/60 flex-1 overflow-y-auto max-h-[500px]">
                            {activities.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Clock className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-900 font-bold text-sm mb-1">No recent activity</p>
                                    <p className="text-gray-500 text-xs font-medium">Activities will appear here</p>
                                </div>
                            ) : (
                                activities.map((activity, index) => {
                                    const Icon = activityIcons[activity.type] || Eye;
                                    const bgColors: Record<string, string> = {
                                        'view': 'bg-blue-50 text-blue-600 border border-blue-100',
                                        'save': 'bg-rose-50 text-rose-600 border border-rose-100',
                                        'inquiry': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                                        'visit': 'bg-orange-50 text-orange-600 border border-orange-100',
                                        'offer': 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    };

                                    return (
                                        <div
                                            key={index}
                                            className="px-6 py-4 hover:bg-gray-50/80 transition-colors group/item"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-xl ${bgColors[activity.type] || 'bg-gray-100 text-gray-600 border border-gray-200'} shadow-sm group-hover/item:scale-110 transition-transform`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="text-sm text-gray-900 font-bold line-clamp-2 leading-snug">
                                                        {activity.title}
                                                    </p>
                                                    {activity.property_title && (
                                                        <p className="text-xs text-gray-500 truncate mt-1 font-medium group-hover/item:text-indigo-600 transition-colors">
                                                            {activity.property_title}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-gray-400 mt-1.5 font-bold uppercase tracking-wider">
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
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100/60 mt-auto">
                                <Link
                                    href="/sell/dashboard/analytics"
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center justify-center gap-1.5 transition-colors group/link"
                                >
                                    View All Activity <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
