'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    Clock,
    Heart,
    MessageSquare,
    ChevronRight,
    Calendar,
    MapPin,
    ArrowUpRight,
    Search,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getImageUrl } from '@/lib/api';
import { getBuyerDashboard, DashboardStats, RecentActivityItem, RecommendedProperty, ActionRequiredItem } from '@/lib/api/buyer';
import { getCurrentUser } from '@/lib/authApi';
import MarketInsightsWidget from '@/components/buyer/MarketInsightsWidget';
import AffordabilityCalculator from '@/components/buyer/AffordabilityCalculator';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import ActionRequiredBanner from '@/components/buyer/ActionRequiredBanner';
import RecentActivityTimeline from '@/components/buyer/RecentActivityTimeline';
import ActiveDealsWidget from '@/components/buyer/ActiveDealsWidget';
import UpcomingVisitsWidget from '@/components/buyer/UpcomingVisitsWidget';
import SavedPropertiesPreview from '@/components/buyer/SavedPropertiesPreview';
import RecentConversationsWidget from '@/components/buyer/RecentConversationsWidget';

export default function BuyerDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<RecentActivityItem[]>([]);
    const [actionRequired, setActionRequired] = useState<ActionRequiredItem[]>([]);
    const [recommended, setRecommended] = useState<RecommendedProperty[]>([]);
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [dashboardData, userData] = await Promise.all([
                    getBuyerDashboard(),
                    getCurrentUser()
                ]);
                if (dashboardData.success) {
                    setStats(dashboardData.stats);
                    setActivity(dashboardData.recent_activity);
                    setActionRequired(dashboardData.action_required || []);
                    setRecommended(dashboardData.recommended);
                }
                setUserName(userData.full_name.split(' ')[0]);
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--gray-50)] pb-20">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                    <DashboardSkeleton />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--gray-50)] pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">

                {/* Header Section: Welcome & High-Level Pulse */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--gray-200)]">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--gray-900)] tracking-tight">
                            Welcome back, {userName}
                        </h1>
                        <p className="text-[var(--gray-600)] mt-1">
                            Here is where you stand on your journey to homeownership.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/properties" className="btn-primary flex items-center gap-2">
                            <Search className="w-4 h-4" /> Start Browsing
                        </Link>
                    </div>
                </div>

                {/* Sub-Header: Action Required Banners (if any) */}
                <ActionRequiredBanner items={actionRequired} />

                {/* Top Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Clock} label="Active Offers" value={stats?.active_offers || 0} href="/offers" />
                    <StatCard icon={Calendar} label="Upcoming Visits" value={stats?.upcoming_visits || 0} href="/visits" />
                    <StatCard icon={Heart} label="Saved Homes" value={stats?.saved_properties || 0} href="/saved-properties" />
                    <StatCard icon={MessageSquare} label="Unread Messages" value={stats?.unread_messages || 0} href="/messages" />
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column (Primary Activity & Timeline) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Transaction Timeline */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Side: Pipeline & Timeline */}
                            <div className="space-y-6 lg:col-span-2">
                                <ActiveDealsWidget />
                            </div>

                            {/* Left/Right Split for Tours & Saved */}
                            <div className="space-y-6">
                                <UpcomingVisitsWidget />
                            </div>
                            <div className="space-y-6">
                                <SavedPropertiesPreview />
                            </div>

                            {/* Full width bottom row for Timeline */}
                            <div className="space-y-6 lg:col-span-2">
                                <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-[var(--color-brand)]" />
                                                Transaction Timeline
                                            </h2>
                                            <p className="text-sm text-[var(--gray-500)] mt-1">A chronogical history of your tours and offers.</p>
                                        </div>
                                        <Link href="/offers" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
                                            View full history
                                        </Link>
                                    </div>
                                    <RecentActivityTimeline items={activity} />
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Right Column (Tools, Agents, Affordability) */}
                    <div className="space-y-6">
                        <RecentConversationsWidget />

                        {/* Recommendations */}
                        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                            <h2 className="text-sm font-bold text-[var(--gray-900)] mb-4 flex items-center gap-2">
                                <Home className="w-4 h-4 text-[var(--color-brand)]" />
                                Recommended
                            </h2>
                            <div className="space-y-4">
                                {recommended.map(property => (
                                    <Link href={`/properties/${property.id}`} key={property.id} className="group block">
                                        <div className="relative aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden mb-2">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                                                style={{ backgroundImage: `url(${getImageUrl(property.image) || '/placeholder-house.jpg'})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            <div className="absolute bottom-2 left-2 right-2 text-white">
                                                <p className="font-bold text-lg">${property.price.toLocaleString()}</p>
                                                <p className="text-[11px] font-medium opacity-90">{property.specs}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-[var(--color-success)] text-white text-[10px] font-bold rounded-full">
                                                95% Match
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-sm text-[var(--gray-900)] group-hover:text-[var(--color-brand)] transition-colors truncate">
                                            {property.title}
                                        </h3>
                                        <div className="flex items-center gap-1 text-[11px] text-[var(--gray-500)] mt-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {property.location}
                                        </div>
                                    </Link>
                                ))}
                                {recommended.length === 0 && (
                                    <div className="text-center py-6 bg-[var(--gray-50)] rounded-[var(--radius-sm)]">
                                        <Home className="w-8 h-8 text-[var(--gray-300)] mx-auto mb-2" />
                                        <p className="text-xs text-[var(--gray-500)]">No recommendations yet</p>
                                    </div>
                                )}
                            </div>
                            <Link href="/properties"
                                className="block w-full text-center py-2.5 border border-[var(--gray-200)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--gray-700)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] mt-4 transition-colors">
                                View All Properties
                            </Link>
                        </div>

                        {/* Market Insights */}
                        <div className="mt-6">
                            <MarketInsightsWidget />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, href }: {
    icon: any; label: string; value: number; href: string;
}) {
    return (
        <Link href={href} className="group block">
            <div className="bg-white border border-[var(--gray-200)] rounded-[var(--card-radius)] p-5 hover:shadow-[var(--shadow-sm)] transition-shadow">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-brand-subtle)] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[var(--color-brand)]" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--gray-300)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-2xl font-bold text-[var(--gray-900)] mb-0.5">{value}</p>
                <p className="text-xs text-[var(--gray-500)] font-medium">{label}</p>
            </div>
        </Link>
    );
}
