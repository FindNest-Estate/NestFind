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
                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand)]/5 via-transparent to-transparent -z-10 blur-3xl rounded-full opacity-60" />
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            Welcome back, {userName}
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Here is where you stand on your journey to homeownership.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/properties" className="btn-primary shadow-lg shadow-[var(--color-brand)]/20 hover:-translate-y-0.5 transition-all flex items-center gap-2">
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
                                <div className="glass-card border border-white/60 p-6 relative overflow-hidden backdrop-blur-xl">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-50" />
                                    <div className="flex justify-between items-center mb-6 relative">
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-blue-500" />
                                                Transaction Timeline
                                            </h2>
                                            <p className="text-sm font-medium text-gray-500 mt-1">A chronogical history of your tours and offers.</p>
                                        </div>
                                        <Link href="/offers" className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                                            Full History
                                        </Link>
                                    </div>
                                    <div className="relative z-10">
                                        <RecentActivityTimeline items={activity} />
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Right Column (Tools, Agents, Affordability) */}
                    <div className="space-y-6">
                        <RecentConversationsWidget />

                        {/* Recommendations */}
                        <div className="glass-card border border-white/60 p-6 backdrop-blur-xl">
                            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                                <Home className="w-5 h-5 text-indigo-500" />
                                Recommended for You
                            </h2>
                            <div className="space-y-4">
                                {recommended.map(property => (
                                    <Link href={`/properties/${property.id}`} key={property.id} className="group block mb-5 last:mb-0">
                                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 border border-white/50 shadow-sm group-hover:shadow-md transition-all">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                                                style={{ backgroundImage: `url(${getImageUrl(property.image) || '/placeholder-house.jpg'})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                                <p className="font-black text-xl tracking-tight leading-none mb-1 text-white/90">₹{property.price.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{property.specs}</p>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-[15px] text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                            {property.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mt-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {property.location}
                                        </div>
                                    </Link>
                                ))}
                                {recommended.length === 0 && (
                                    <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-500">No recommendations yet</p>
                                    </div>
                                )}
                            </div>
                            <Link href="/properties"
                                className="block w-full text-center py-3 border border-gray-200 bg-gray-50 rounded-xl text-xs font-bold tracking-widest uppercase text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 mt-5 transition-all">
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
            <div className="glass-card relative overflow-hidden backdrop-blur-xl p-6 border border-white/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-full blur-2xl group-hover:from-[var(--color-brand)]/20 transition-colors" />
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-brand-subtle)] to-[var(--color-brand)]/5 flex items-center justify-center border border-white/60 shadow-inner">
                        <Icon className="w-5 h-5 text-[var(--color-brand)]" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--gray-400)] group-hover:text-[var(--color-brand)] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-2xl font-bold text-[var(--gray-900)] mb-0.5">{value}</p>
                <p className="text-xs text-[var(--gray-500)] font-medium">{label}</p>
            </div>
        </Link>
    );
}
