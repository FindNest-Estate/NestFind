'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Home,
    Clock,
    Heart,
    MessageSquare,
    ChevronRight,
    Calendar,
    MapPin,
    ArrowUpRight,
    Loader2,
    Search,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getBuyerDashboard, DashboardStats, RecentActivityItem, RecommendedProperty } from '@/lib/api/buyer';
import { getCurrentUser } from '@/lib/authApi';
import MarketInsightsWidget from '@/components/buyer/MarketInsightsWidget';
import AffordabilityCalculator from '@/components/buyer/AffordabilityCalculator';
import EventsTimeline from '@/components/buyer/EventsTimeline';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function BuyerDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activity, setActivity] = useState<RecentActivityItem[]>([]);
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
                    setRecommended(dashboardData.recommended);
                }
                setUserName(userData.full_name.split(' ')[0]); // First name
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                    <DashboardSkeleton />
                </main>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Welcome Header with Gradient */}
                    <motion.div variants={itemVariants} className="mb-8">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 p-8 text-white">
                            <div className="relative z-10">
                                <h1 className="text-4xl font-bold mb-2">
                                    Welcome back, {userName}! 👋
                                </h1>
                                <p className="text-white/90 text-lg">
                                    Your dream home is waiting. Let's find it together.
                                </p>
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/20 rounded-full blur-2xl"></div>
                        </div>
                    </motion.div>

                    {/* Quick Stats Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            icon={Clock}
                            label="Active Offers"
                            value={stats?.active_offers || 0}
                            color="bg-blue-500"
                            gradient="from-blue-500 to-blue-600"
                            href="/offers"
                        />
                        <StatCard
                            icon={Calendar}
                            label="Upcoming Visits"
                            value={stats?.upcoming_visits || 0}
                            color="bg-emerald-500"
                            gradient="from-emerald-500 to-teal-600"
                            href="/visits"
                        />
                        <StatCard
                            icon={Heart}
                            label="Saved Homes"
                            value={stats?.saved_properties || 0}
                            color="bg-rose-500"
                            gradient="from-rose-500 to-pink-600"
                            href="/saved-properties"
                        />
                        <StatCard
                            icon={MessageSquare}
                            label="Unread Messages"
                            value={stats?.unread_messages || 0}
                            color="bg-indigo-500"
                            gradient="from-indigo-500 to-purple-600"
                            href="/messages"
                        />
                    </motion.div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Widgets */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Market Insights */}
                            <motion.div variants={itemVariants}>
                                <MarketInsightsWidget />
                            </motion.div>

                            {/* Affordability Calculator */}
                            <motion.div variants={itemVariants}>
                                <AffordabilityCalculator />
                            </motion.div>

                            {/* Recent Activity */}
                            <motion.div variants={itemVariants}>
                                <div className="glass-card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-rose-500" />
                                            Your Journey
                                        </h2>
                                        <Link href="/notifications" className="text-sm font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors">
                                            View All <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    {activity.length > 0 ? (
                                        <div className="space-y-6">
                                            {activity.map((item, index) => (
                                                <div key={item.id} className="relative pl-6 pb-6 border-l-2 border-gray-100 last:pb-0 hover:border-rose-200 transition-colors">
                                                    <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full border-2 border-white ${item.type === 'offer' ? 'bg-blue-500' : 'bg-emerald-500'
                                                        } shadow-lg`} />
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {item.type === 'offer' ? 'Offer Update' : 'Visit Scheduled'}
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {item.title}
                                                            </p>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusColor(item.status)}`}>
                                                                {item.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(item.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-dashed border-gray-200">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                <Clock className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-600 font-medium mb-2">No recent activity yet</p>
                                            <p className="text-gray-500 text-sm mb-4">Start your home search journey today</p>
                                            <Link href="/properties" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                                <Search className="w-4 h-4" />
                                                Browse Properties
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Continue Search Banner */}
                            <motion.div variants={itemVariants}>
                                <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-bold mb-3">Continue your search</h2>
                                        <p className="text-gray-300 mb-6 max-w-md">
                                            Browse thousands of verified properties and find your perfect match today.
                                        </p>
                                        <Link
                                            href="/properties"
                                            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all"
                                        >
                                            Browse Properties <ArrowUpRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                    <div className="absolute right-0 top-0 h-full w-1/2 opacity-10">
                                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80')] bg-cover bg-center" />
                                    </div>
                                    {/* Decorative gradient orbs */}
                                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/30 rounded-full blur-3xl"></div>
                                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column - Events & Recommendations */}
                        <div className="space-y-6">
                            {/* Events Timeline */}
                            <motion.div variants={itemVariants}>
                                <EventsTimeline />
                            </motion.div>

                            {/* Recommendations */}
                            <motion.div variants={itemVariants}>
                                <div className="glass-card p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Home className="w-5 h-5 text-rose-500" />
                                        Recommended
                                    </h2>
                                    <div className="space-y-4">
                                        {recommended.map(property => (
                                            <Link href={`/properties/${property.id}`} key={property.id} className="group block">
                                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 shadow-md">
                                                    <div
                                                        className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                                                        style={{ backgroundImage: `url(${property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80'})` }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                                        <p className="font-bold text-xl mb-1">${property.price.toLocaleString()}</p>
                                                        <p className="text-xs font-medium opacity-90">{property.specs}</p>
                                                    </div>
                                                    {/* Match score badge */}
                                                    <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                                                        95% Match
                                                    </div>
                                                </div>
                                                <h3 className="font-semibold text-gray-900 group-hover:text-rose-500 transition-colors truncate">
                                                    {property.title}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {property.location}
                                                </div>
                                            </Link>
                                        ))}
                                        {recommended.length === 0 && (
                                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                                                <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 text-sm">No recommendations yet</p>
                                            </div>
                                        )}
                                    </div>
                                    <Link
                                        href="/properties"
                                        className="block w-full text-center py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 mt-4 transition-all"
                                    >
                                        View All Properties
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                </motion.div>
            </main>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, gradient, href }: {
    icon: any;
    label: string;
    value: number;
    color: string;
    gradient: string;
    href: string;
}) {
    return (
        <Link href={href} className="group block">
            <div className="glass-card p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w- h-6 text-white" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
                    <p className="text-sm text-gray-500 font-medium">{label}</p>
                </div>
            </div>
        </Link>
    );
}

function getStatusColor(status: string) {
    status = status.toUpperCase();
    if (['ACCEPTED', 'APPROVED', 'COMPLETED'].includes(status)) return 'bg-emerald-100 text-emerald-700';
    if (['PENDING', 'REQUESTED', 'SCHEDULED'].includes(status)) return 'bg-blue-100 text-blue-700';
    if (['REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(status)) return 'bg-red-100 text-red-700';
    if (['COUNTERED'].includes(status)) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
}
