'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
    ArrowLeft,
    Home,
    MapPin,
    Bed,
    Bath,
    Square,
    Edit,
    Eye,
    Calendar,
    TrendingUp,
    TrendingDown,
    Users,
    Bookmark,
    FileText,
    MessageCircle,
    Loader2,
    AlertCircle,
    ExternalLink,
    Clock,
    IndianRupee,
    Activity,
    BarChart3,
    PieChart,
    CheckCircle2,
    XCircle,
    Sparkles,
    Award,
    Target,
    Star,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Bell,
    Share2,
    Copy,
    Settings,
    ChevronRight,
    CircleDot,
    Phone,
    Mail
} from 'lucide-react';
import { getCurrentUser } from '@/lib/authApi';
import { getPropertyDetail, PropertyDetail } from '@/lib/api/public';
import {
    getPropertyStats,
    PropertyStats,
    getWeeklyViews,
    WeeklyViewStats,
    getRecentActivity,
    ActivityItem as ActivityLogItem
} from '@/lib/api/propertyStats';

interface PageParams {
    id: string;
}

function formatPrice(price: number | null): string {
    if (!price) return 'Price on Request';
    if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
        return `₹${(price / 100000).toFixed(2)} Lakh`;
    }
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(price);
}

function formatCompactNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function getImageUrl(fileUrl: string): string {
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://localhost:8000${fileUrl}`;
}

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        const incrementTime = duration / end || 50;

        const timer = setInterval(() => {
            start += 1;
            setCount(start);
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [value, duration]);

    return <>{count}</>;
}

// Progress Ring Component
function ProgressRing({ progress, size = 60, color = '#10b981' }: { progress: number; size?: number; color?: string }) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
            <circle
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    transition: 'stroke-dashoffset 1s ease-out'
                }}
            />
        </svg>
    );
}

// Mini Bar Chart Component
function MiniBarChart({ data, maxValue }: { data: WeeklyViewStats[]; maxValue: number }) {
    if (!data || data.length === 0) return <div className="text-gray-400 text-sm py-4 text-center">No view data available</div>;

    return (
        <div className="flex items-end gap-1 h-32 w-full">
            {data.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex-grow flex items-end justify-center bg-gray-50 rounded-t-sm overflow-hidden">
                        <div
                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-sm transition-all duration-500 group-hover:from-emerald-600 group-hover:to-emerald-400"
                            style={{ height: `${maxValue > 0 ? (item.views / maxValue) * 100 : 0}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {item.views} views
                        </div>
                    </div>
                    <span className="text-xs text-gray-400">{item.day_name}</span>
                </div>
            ))}
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode; pulse?: boolean }> = {
        'ACTIVE': { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', text: 'text-white', icon: <CheckCircle2 className="w-3.5 h-3.5" />, pulse: true },
        'DRAFT': { bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-white', icon: <Edit className="w-3.5 h-3.5" /> },
        'RESERVED': { bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-white', icon: <Clock className="w-3.5 h-3.5" /> },
        'SOLD': { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white', icon: <Award className="w-3.5 h-3.5" /> },
        'INACTIVE': { bg: 'bg-gray-400', text: 'text-white', icon: <XCircle className="w-3.5 h-3.5" /> }
    };
    const { bg, text, icon, pulse } = config[status] || config['INACTIVE'];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${bg} ${text} shadow-lg`}>
            {pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            {icon}
            {status}
        </span>
    );
}

// Stat Card Component
function StatCard({
    icon,
    label,
    value,
    subtext,
    trend,
    gradient
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    gradient: string;
}) {
    return (
        <div className="group relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {/* Background decoration */}
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />

            <div className="relative">
                <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    {icon}
                </div>
                <div className="text-sm text-gray-500 mb-1">{label}</div>
                <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-gray-900">
                        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
                    </div>
                </div>
                {subtext && (
                    <div className="text-xs text-gray-400 mt-1">{subtext}</div>
                )}
            </div>
        </div>
    );
}

// Activity Item Component
function ActivityItem({ item }: { item: ActivityLogItem }) {
    const icons = {
        view: <Eye className="w-4 h-4 text-blue-600" />,
        save: <Bookmark className="w-4 h-4 text-rose-500" />,
        inquiry: <MessageCircle className="w-4 h-4 text-purple-600" />,
        visit: <Calendar className="w-4 h-4 text-amber-600" />,
        offer: <FileText className="w-4 h-4 text-green-600" />
    };

    const colors = {
        view: 'bg-blue-100',
        save: 'bg-rose-100',
        inquiry: 'bg-purple-100',
        visit: 'bg-amber-100',
        offer: 'bg-green-100'
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-8 h-8 rounded-full ${colors[item.type]} flex items-center justify-center flex-shrink-0`}>
                {icons[item.type]}
            </div>
            <div className="flex-grow min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                <div className="text-xs text-gray-500">{item.relative_time || item.timestamp.split('T')[0]}</div>
            </div>
        </div>
    );
}

export default function PropertyManagePage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [stats, setStats] = useState<PropertyStats | null>(null);
    const [weeklyViews, setWeeklyViews] = useState<WeeklyViewStats[]>([]);
    const [activities, setActivities] = useState<ActivityLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'engagement'>('overview');
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/properties/${property?.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            setError(null);

            try {
                // Load property details
                const data = await getPropertyDetail(resolvedParams.id);

                // Verify ownership (or agent assignment if expanded later)
                if (!data.viewer?.is_owner) {
                    setError('You do not have permission to manage this property.');
                    setIsLoading(false);
                    return;
                }

                setProperty(data);

                // Load all stats in parallel
                try {
                    const [statsData, viewsData, activityData] = await Promise.all([
                        getPropertyStats(resolvedParams.id),
                        getWeeklyViews(resolvedParams.id),
                        getRecentActivity(resolvedParams.id)
                    ]);

                    if (statsData) setStats(statsData);
                    if (viewsData) setWeeklyViews(viewsData.weekly_views);
                    if (activityData) setActivities(activityData);

                } catch (e) {
                    console.error('Failed to load stats:', e);
                }

            } catch (err: any) {
                if (err?.status === 401) {
                    router.push(`/login?redirect=/sell/${resolvedParams.id}`);
                    return;
                }
                setError(err?.message || 'Failed to load property.');
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [resolvedParams.id, router]);

    // Calculate engagement score (0-100) based on REAL stats
    const engagementScore = useMemo(() => {
        if (!stats) return 0;
        const views = stats.total_views || 0;
        const saves = stats.owner_stats?.saves_count || 0;
        const inquiries = stats.owner_stats?.inquiries_count || 0;

        // Weighted score logic
        const viewScore = Math.min(views / 50 * 30, 30);
        const saveScore = Math.min(saves / 10 * 35, 35);
        const inquiryScore = Math.min(inquiries / 5 * 35, 35);

        return Math.round(viewScore + saveScore + inquiryScore);
    }, [stats]);

    // Performance indicator
    const performanceLevel = useMemo(() => {
        if (engagementScore >= 70) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
        if (engagementScore >= 40) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
        return { label: 'Needs Attention', color: 'text-amber-600', bg: 'bg-amber-100' };
    }, [engagementScore]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
                <Navbar />
                <div className="flex flex-col justify-center items-center pt-32 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                        <Sparkles className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-600 font-medium">Loading property dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30">
                <Navbar />
                <div className="max-w-2xl mx-auto pt-32 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {error || 'Property not found'}
                    </h1>
                    <Link
                        href="/sell/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full hover:shadow-lg transition-all font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const thumbnail = property.media.find(m => m.is_primary) || property.media[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <Link
                            href="/sell/dashboard"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-600 text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            Property Dashboard
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${performanceLevel.bg} ${performanceLevel.color}`}>
                                {performanceLevel.label}
                            </span>
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={copyLink}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${copied
                                ? 'bg-green-100 text-green-700'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                                }`}
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <Link
                            href={`/properties/${property.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Listing
                        </Link>
                        <Link
                            href={`/sell/create?edit=${property.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Property
                        </Link>
                    </div>
                </div>

                {/* Hero Property Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
                    <div className="relative h-64 sm:h-80 bg-gradient-to-br from-gray-100 to-gray-200">
                        {thumbnail ? (
                            <img
                                src={getImageUrl(thumbnail.file_url)}
                                alt={property.title || 'Property'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-20 h-20 text-gray-300" />
                            </div>
                        )}
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Status badge */}
                        <div className="absolute top-4 right-4">
                            <StatusBadge status={property.status} />
                        </div>

                        {/* Property info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-lg">
                                {property.title || 'Untitled Property'}
                            </h2>
                            <div className="flex items-center gap-2 text-white/90 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">
                                    {[property.address, property.city, property.state].filter(Boolean).join(', ')}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-3xl font-bold">{formatPrice(property.price)}</div>
                                <div className="flex gap-3 text-sm bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                                    {property.bedrooms !== null && (
                                        <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {property.bedrooms}</span>
                                    )}
                                    {property.bathrooms !== null && (
                                        <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {property.bathrooms}</span>
                                    )}
                                    {property.area_sqft !== null && (
                                        <span className="flex items-center gap-1"><Square className="w-4 h-4" /> {property.area_sqft.toLocaleString()} sqft</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit mx-auto">
                    {(['overview', 'analytics', 'engagement'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === tab
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={<Eye className="w-5 h-5 text-white" />}
                                label="Total Views"
                                value={stats?.total_views || 0}
                                subtext="All time views"
                                trend="up"
                                gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                            />
                            <StatCard
                                icon={<TrendingUp className="w-5 h-5 text-white" />}
                                label="Weekly Views"
                                value={stats?.owner_stats?.last_7_days_views || 0}
                                subtext="Last 7 days"
                                gradient="bg-gradient-to-br from-green-500 to-emerald-600"
                            />
                            <StatCard
                                icon={<Bookmark className="w-5 h-5 text-white" />}
                                label="Saves"
                                value={stats?.owner_stats?.saves_count || 0}
                                subtext="Times saved to list"
                                trend="up"
                                gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                            />
                            <StatCard
                                icon={<MessageCircle className="w-5 h-5 text-white" />}
                                label="Inquiries"
                                value={stats?.owner_stats?.inquiries_count || 0}
                                subtext="Active conversations"
                                gradient="bg-gradient-to-br from-purple-500 to-violet-600"
                            />
                        </div>

                        {/* Overview Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Property Insights */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-emerald-600" />
                                    Property Insights
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-medium">Days on Market</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">{stats?.days_on_market || 0}</div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                            <IndianRupee className="w-4 h-4" />
                                            <span className="text-sm font-medium">Price/sqft</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            ₹{stats?.price_per_sqft ? Math.round(stats.price_per_sqft).toLocaleString() : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm font-medium">Pending Visits</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">{stats?.owner_stats?.pending_visits || 0}</div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                                            <FileText className="w-4 h-4" />
                                            <span className="text-sm font-medium">Active Offers</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">{stats?.owner_stats?.active_offers || 0}</div>
                                    </div>
                                </div>

                                {/* Highest Offer */}
                                {stats?.owner_stats?.highest_offer && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-xl text-white shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium opacity-90 flex items-center gap-1 mb-1">
                                                    <Award className="w-4 h-4" />
                                                    Highest Offer
                                                </div>
                                                <div className="text-3xl font-bold text-white">
                                                    {formatPrice(stats.owner_stats.highest_offer)}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/offers?property=${property.id}`}
                                                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-bold hover:bg-white/30 transition-colors"
                                            >
                                                View Offers
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Quick Actions
                                </h3>
                                <div className="space-y-2">
                                    <Link
                                        href={`/sell/create?edit=${property.id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                                            <Edit className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold text-gray-900">Edit Listing</div>
                                            <div className="text-xs text-gray-500">Update details & photos</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                    <Link
                                        href={`/visits?property=${property.id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                                            <Calendar className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold text-gray-900">Manage Visits</div>
                                            <div className="text-xs text-gray-500">{stats?.owner_stats?.pending_visits || 0} pending</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                    <Link
                                        href={`/offers?property=${property.id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border border-purple-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-md">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold text-gray-900">View Offers</div>
                                            <div className="text-xs text-gray-500">{stats?.owner_stats?.active_offers || 0} active</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                    <Link
                                        href="/messages"
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 border border-rose-100 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md">
                                            <MessageCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold text-gray-900">Messages</div>
                                            <div className="text-xs text-gray-500">Chat with buyers</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'analytics' && (
                    <>
                        {/* Analytics Stats Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={<Eye className="w-5 h-5 text-white" />}
                                label="Total Views"
                                value={stats?.total_views || 0}
                                subtext="All time"
                                gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                            />
                            <StatCard
                                icon={<Clock className="w-5 h-5 text-white" />}
                                label="Days on Market"
                                value={stats?.days_on_market || 0}
                                subtext="Since listing"
                                gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                            />
                            <StatCard
                                icon={<IndianRupee className="w-5 h-5 text-white" />}
                                label="Price/sqft"
                                value={stats?.price_per_sqft ? `₹${Math.round(stats.price_per_sqft).toLocaleString()}` : 'N/A'}
                                subtext="Market rate"
                                gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                            />
                            <StatCard
                                icon={<TrendingUp className="w-5 h-5 text-white" />}
                                label="Weekly Views"
                                value={stats?.owner_stats?.last_7_days_views || 0}
                                subtext="Last 7 days"
                                gradient="bg-gradient-to-br from-purple-500 to-violet-600"
                            />
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Weekly Views Chart */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                                        Weekly Views Trend
                                    </h3>
                                    <span className="text-sm text-gray-500">Last 7 days</span>
                                </div>
                                <MiniBarChart
                                    data={weeklyViews}
                                    maxValue={Math.max(...(weeklyViews.map(v => v.views) || [5]))}
                                />
                            </div>

                            {/* Engagement Score */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                        Engagement Score
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${performanceLevel.bg} ${performanceLevel.color}`}>
                                        {performanceLevel.label}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-8">
                                    <div className="relative">
                                        <ProgressRing progress={engagementScore} size={120} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-gray-900">{engagementScore}</span>
                                            <span className="text-xs text-gray-500">/ 100</span>
                                        </div>
                                    </div>
                                    <div className="flex-grow space-y-3 w-full">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Views</span>
                                                <span className="font-medium">{Math.min(stats?.total_views || 0, 50)}/50</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.min((stats?.total_views || 0) / 50 * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Saves</span>
                                                <span className="font-medium">{Math.min(stats?.owner_stats?.saves_count || 0, 10)}/10</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.min((stats?.owner_stats?.saves_count || 0) / 10 * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Inquiries</span>
                                                <span className="font-medium">{Math.min(stats?.owner_stats?.inquiries_count || 0, 5)}/5</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.min((stats?.owner_stats?.inquiries_count || 0) / 5 * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Comparison */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-emerald-600" />
                                Performance vs Market Average
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                                    <div className="text-3xl font-bold text-blue-600 mb-1">{stats?.total_views || 0}</div>
                                    <div className="text-sm text-gray-600">Your Views</div>
                                    <div className="text-xs text-gray-400 mt-1">Avg: 45 views</div>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                                    <div className="text-3xl font-bold text-emerald-600 mb-1">{stats?.days_on_market || 0}</div>
                                    <div className="text-sm text-gray-600">Days Listed</div>
                                    <div className="text-xs text-gray-400 mt-1">Avg: 30 days</div>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                                    <div className="text-3xl font-bold text-purple-600 mb-1">{stats?.owner_stats?.active_offers || 0}</div>
                                    <div className="text-sm text-gray-600">Active Offers</div>
                                    <div className="text-xs text-gray-400 mt-1">Avg: 2 offers</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'engagement' && (
                    <>
                        {/* Engagement Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={<Users className="w-5 h-5 text-white" />}
                                label="Total Visitors"
                                value={stats?.total_views || 0}
                                subtext="Unique views"
                                gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                            />
                            <StatCard
                                icon={<Bookmark className="w-5 h-5 text-white" />}
                                label="Saved by Buyers"
                                value={stats?.owner_stats?.saves_count || 0}
                                subtext="Wishlisted"
                                gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                            />
                            <StatCard
                                icon={<MessageCircle className="w-5 h-5 text-white" />}
                                label="Inquiries"
                                value={stats?.owner_stats?.inquiries_count || 0}
                                subtext="Conversations"
                                gradient="bg-gradient-to-br from-purple-500 to-violet-600"
                            />
                            <StatCard
                                icon={<Calendar className="w-5 h-5 text-white" />}
                                label="Visit Requests"
                                value={stats?.owner_stats?.pending_visits || 0}
                                subtext="Pending"
                                gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                            />
                        </div>

                        {/* Engagement Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Conversion Funnel */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-emerald-600" />
                                    Buyer Conversion Funnel
                                </h3>
                                <div className="space-y-4">
                                    {/* Views */}
                                    <div className="relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-700 flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-blue-500" /> Property Views
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">{stats?.total_views || 0}</span>
                                        </div>
                                        <div className="h-8 bg-blue-100 rounded-lg overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    {/* Saves */}
                                    <div className="relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-700 flex items-center gap-2">
                                                <Bookmark className="w-4 h-4 text-rose-500" /> Saved to Wishlist
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">{stats?.owner_stats?.saves_count || 0}</span>
                                        </div>
                                        <div className="h-8 bg-rose-100 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-lg transition-all duration-1000"
                                                style={{ width: `${stats?.total_views ? Math.min((stats?.owner_stats?.saves_count || 0) / stats.total_views * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Inquiries */}
                                    <div className="relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-700 flex items-center gap-2">
                                                <MessageCircle className="w-4 h-4 text-purple-500" /> Started Conversation
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">{stats?.owner_stats?.inquiries_count || 0}</span>
                                        </div>
                                        <div className="h-8 bg-purple-100 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg transition-all duration-1000"
                                                style={{ width: `${stats?.total_views ? Math.min((stats?.owner_stats?.inquiries_count || 0) / stats.total_views * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    {/* Offers */}
                                    <div className="relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-700 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-emerald-500" /> Made an Offer
                                            </span>
                                            <span className="text-lg font-bold text-gray-900">{stats?.owner_stats?.active_offers || 0}</span>
                                        </div>
                                        <div className="h-8 bg-emerald-100 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg transition-all duration-1000"
                                                style={{ width: `${stats?.total_views ? Math.min((stats?.owner_stats?.active_offers || 0) / stats.total_views * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Feed */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-600" />
                                    Recent Activity
                                </h3>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                    {activities.length > 0 ? (
                                        activities.map((item, idx) => (
                                            <ActivityItem key={idx} item={item} />
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 text-sm">
                                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No recent activity
                                        </div>
                                    )}
                                </div>
                                {activities.length > 0 && (
                                    <button className="w-full mt-4 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-colors">
                                        View All Activity
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tips Section */}
                        <div className="mt-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5" />
                                <span className="font-bold">Boost Your Engagement</span>
                            </div>
                            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-emerald-100">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Add 10+ high-quality photos to increase views by 40%</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Respond to inquiries within 1 hour for 3x conversion</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Enable flexible visit slots to get more bookings</span>
                                </li>
                            </ul>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
