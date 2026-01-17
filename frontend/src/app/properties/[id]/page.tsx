'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Square,
    Home,
    Building2,
    Warehouse,
    TreePine,
    Mail,
    Phone,
    Calendar,
    Share2,
    Heart,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    AlertCircle,
    Edit,
    BadgeCheck,
    MessageCircle,
    Eye,
    Clock,
    Compass,
    CarFront,
    Sofa,
    TrendingUp,
    Users,
    FileText,
    IndianRupee,
    Calculator,
    Sparkles,
    ArrowUpRight,
    LayoutTemplate,
    Bookmark,
    Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/authApi';
import { getPropertyDetail, PropertyDetail } from '@/lib/api/public';
import { post } from '@/lib/api';
import AdminPropertyControls from '@/components/admin/AdminPropertyControls';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import ScheduleTourModal from '@/components/property/ScheduleTourModal';
import {
    getPropertyStats,
    getSimilarProperties,
    recordPropertyView,
    PropertyStats,
    SimilarProperty
} from '@/lib/api/propertyStats';

/**
 * Property Detail Page - /properties/[id]
 * 
 * Public page showing full property details.
 * No authentication required.
 */

const PROPERTY_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    HOUSE: Home,
    APARTMENT: Building2,
    LAND: TreePine,
    COMMERCIAL: Warehouse,
};

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

// Helper to get full image URL
function getImageUrl(fileUrl: string): string {
    if (fileUrl.startsWith('http')) return fileUrl;
    return `http://localhost:8000${fileUrl}`;
}

// Format number in Indian style
function formatIndianNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
}

// EMI Calculator Component
const BANK_RATES = [
    { name: 'SBI', rate: 8.50 },
    { name: 'HDFC', rate: 8.70 },
    { name: 'ICICI', rate: 8.75 },
    { name: 'Axis', rate: 8.75 },
    { name: 'Kotak', rate: 8.85 },
    { name: 'BoB', rate: 8.40 },
    { name: 'PNB', rate: 8.50 },
];

function EMICalculator({ propertyPrice }: { propertyPrice: number }) {
    const [loanPercentage, setLoanPercentage] = useState(80);
    const [interestRate, setInterestRate] = useState(8.5);
    const [tenure, setTenure] = useState(20);
    const [selectedBank, setSelectedBank] = useState<string>('Custom');

    const loanAmount = (propertyPrice * loanPercentage) / 100;

    const emi = useMemo(() => {
        const monthlyRate = interestRate / 12 / 100;
        const months = tenure * 12;
        if (monthlyRate === 0) return loanAmount / months;
        const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1);
        return isNaN(emi) ? 0 : emi;
    }, [loanAmount, interestRate, tenure]);

    const totalInterest = (emi * tenure * 12) - loanAmount;

    const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const bankName = e.target.value;
        setSelectedBank(bankName);
        if (bankName !== 'Custom') {
            const bank = BANK_RATES.find(b => b.name === bankName);
            if (bank) setInterestRate(bank.rate);
        }
    };

    return (
        <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-violet-200">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">EMI Calculator</h3>
            </div>

            {/* EMI Display */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3 mb-4">
                <div className="text-xs text-gray-500 mb-1">Estimated Monthly EMI</div>
                <div className="text-2xl font-bold text-violet-700">
                    ₹{formatIndianNumber(emi)}
                </div>
            </div>

            {/* Bank Selection */}
            <div className="mb-4">
                <label className="text-xs text-gray-600 mb-1 block">Select Bank (for Interest Rate)</label>
                <select
                    value={selectedBank}
                    onChange={handleBankChange}
                    className="w-full text-sm p-2 rounded-lg border border-violet-200 bg-white/50 focus:bg-white transition-colors outline-none focus:border-violet-400"
                >
                    <option value="Custom">Custom Rate</option>
                    {BANK_RATES.map(bank => (
                        <option key={bank.name} value={bank.name}>{bank.name} ({bank.rate}%)</option>
                    ))}
                </select>
            </div>

            {/* Loan Amount Slider */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Loan Amount ({loanPercentage}%)</span>
                    <span className="font-medium text-gray-900">₹{formatIndianNumber(loanAmount)}</span>
                </div>
                <input
                    type="range"
                    min="50"
                    max="90"
                    value={loanPercentage}
                    onChange={(e) => setLoanPercentage(Number(e.target.value))}
                    className="w-full h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
            </div>

            {/* Interest Rate */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-medium text-gray-900">{interestRate}% p.a.</span>
                </div>
                <input
                    type="range"
                    min="6"
                    max="15"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => {
                        setInterestRate(Number(e.target.value));
                        setSelectedBank('Custom');
                    }}
                    className="w-full h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
            </div>

            {/* Tenure */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Loan Tenure</span>
                    <span className="font-medium text-gray-900">{tenure} Years</span>
                </div>
                <div className="flex gap-1">
                    {[10, 15, 20, 25, 30].map((y) => (
                        <button
                            key={y}
                            onClick={() => setTenure(y)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tenure === y
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'bg-white text-gray-700 hover:bg-violet-100'
                                }`}
                        >
                            {y}Y
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-violet-200">
                <div className="text-center p-2 bg-white/60 rounded-lg">
                    <div className="text-xs text-gray-500">Principal</div>
                    <div className="text-sm font-semibold text-gray-900">₹{formatIndianNumber(loanAmount)}</div>
                </div>
                <div className="text-center p-2 bg-white/60 rounded-lg">
                    <div className="text-xs text-gray-500">Total Interest</div>
                    <div className="text-sm font-semibold text-orange-600">₹{formatIndianNumber(totalInterest)}</div>
                </div>
            </div>
        </div>
    );
}

// Property Insights Card Component
function PropertyInsights({
    price,
    area,
    stats
}: {
    price: number | null;
    area: number | null;
    stats: PropertyStats | null;
}) {
    const pricePerSqft = stats?.price_per_sqft || (price && area ? Math.round(price / area) : null);

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Property Insights
            </h3>
            <div className="space-y-2">
                {pricePerSqft && (
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-gray-600">Price per sq.ft</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">₹{formatIndianNumber(pricePerSqft)}</span>
                    </div>
                )}
                {stats && (
                    <>
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-xs text-gray-600">Days on Market</span>
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{stats.days_on_market} days</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-purple-600" />
                                <span className="text-xs text-gray-600">Total Views</span>
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{stats.total_views}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Owner Analytics Dashboard Component
function OwnerAnalytics({ stats }: { stats: PropertyStats }) {
    if (!stats.owner_stats) return null;

    const { owner_stats } = stats;

    return (
        <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-xl p-4 shadow-sm border border-emerald-200">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-sm">Property Analytics</h3>
                    <p className="text-xs text-emerald-700">Owner Dashboard</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center">
                    <Eye className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">{stats.total_views}</div>
                    <div className="text-xs text-gray-500">Total Views</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">{owner_stats.last_7_days_views}</div>
                    <div className="text-xs text-gray-500">Views (7 days)</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center">
                    <Bookmark className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">{owner_stats.saves_count}</div>
                    <div className="text-xs text-gray-500">Saves</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">{owner_stats.inquiries_count}</div>
                    <div className="text-xs text-gray-500">Inquiries</div>
                </div>
            </div>

            {/* Pending Items */}
            <div className="space-y-2 pt-3 border-t border-emerald-200">
                <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-gray-700">Pending Visits</span>
                    </div>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                        {owner_stats.pending_visits}
                    </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-700">Active Offers</span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {owner_stats.active_offers}
                    </span>
                </div>
                {owner_stats.highest_offer && (
                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-gray-700">Highest Offer</span>
                        </div>
                        <span className="font-semibold text-amber-700 text-sm">
                            {formatPrice(owner_stats.highest_offer)}
                        </span>
                    </div>
                )}
            </div>

            <Link
                href={`/sell/${stats.property_id}`}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow text-sm"
            >
                <Edit className="w-4 h-4" />
                Manage Property
            </Link>
        </div>
    );
}

// Similar Properties Carousel Component
function SimilarPropertiesSection({ properties }: { properties: SimilarProperty[] }) {
    if (properties.length === 0) return null;

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mt-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Similar Properties
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {properties.slice(0, 6).map((prop) => (
                    <Link
                        key={prop.id}
                        href={`/properties/${prop.id}`}
                        className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all"
                    >
                        <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden">
                            {prop.thumbnail_url ? (
                                <img
                                    src={getImageUrl(prop.thumbnail_url)}
                                    alt={prop.title || 'Property'}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Home className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </div>
                        <div className="p-2.5">
                            <div className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-[#FF385C] transition-colors">
                                {formatPrice(prop.price)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {prop.title || `${prop.type} in ${prop.city}`}
                            </div>
                            {(prop.bedrooms || prop.bathrooms || prop.area_sqft) && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                    {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                                    {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                                    {prop.area_sqft && <span>{prop.area_sqft.toLocaleString()} sqft</span>}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}


function ImageGallery({ media }: { media: PropertyDetail['media'] }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    if (media.length === 0) {
        return (
            <div className="aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <Home className="w-24 h-24 text-gray-300" />
            </div>
        );
    }

    const currentImage = media[selectedIndex];

    return (
        <>
            {/* Main Image */}
            <div className="relative aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden mb-4">
                <img
                    src={getImageUrl(currentImage.file_url)}
                    alt={`Property image ${selectedIndex + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setIsLightboxOpen(true)}
                />

                {/* Navigation Arrows */}
                {media.length > 1 && (
                    <>
                        <button
                            onClick={() => setSelectedIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setSelectedIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                    {selectedIndex + 1} / {media.length}
                </div>
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {media.map((img, idx) => (
                        <button
                            key={img.id}
                            onClick={() => setSelectedIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === selectedIndex ? 'border-[#FF385C]' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={getImageUrl(img.file_url)}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <button
                        onClick={() => setSelectedIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1))}
                        className="absolute left-4 p-3 text-white/70 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>
                    <img
                        src={getImageUrl(currentImage.file_url)}
                        alt={`Property image ${selectedIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                    />
                    <button
                        onClick={() => setSelectedIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1))}
                        className="absolute right-4 p-3 text-white/70 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>
                </div>
            )}
        </>
    );
}

interface PageParams {
    id: string;
}

export default function PropertyDetailPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isContacting, setIsContacting] = useState(false);

    // Property Stats
    const [propertyStats, setPropertyStats] = useState<PropertyStats | null>(null);
    const [similarProperties, setSimilarProperties] = useState<SimilarProperty[]>([]);

    const handleContactAgent = async () => {
        if (!property?.agent) return;

        try {
            await getCurrentUser(); // Check if logged in
        } catch {
            router.push(`/login?redirect=/properties/${property.id}`);
            return;
        }

        setIsContacting(true);
        try {
            const data = await post<{ conversation_id: string }>('/conversations', {
                agent_id: property.agent.id,
                property_id: property.id
            });
            router.push(`/messages?id=${data.conversation_id}`);
        } catch (err: any) {
            alert(err?.message || 'Failed to start conversation');
            setIsContacting(false);
        }
    };


    // Save functionality
    const [isSaved, setIsSaved] = useState(false);
    const [isAdminOverrideOpen, setIsAdminOverrideOpen] = useState(false);
    const [isTourModalOpen, setIsTourModalOpen] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);

    useEffect(() => {
        async function loadProperty() {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getPropertyDetail(resolvedParams.id);
                setProperty(data);

                // Check if saved (only if user might be logged in)
                try {
                    const saved = await checkIfSaved(resolvedParams.id);
                    setIsSaved(saved);
                } catch (e) {
                    // Ignore error, likely not logged in
                }

                // Record view (fire and forget)
                recordPropertyView(resolvedParams.id).catch(() => { });

                // Load property stats
                const stats = await getPropertyStats(resolvedParams.id);
                setPropertyStats(stats);

                // Load similar properties
                const similar = await getSimilarProperties(resolvedParams.id, 6);
                setSimilarProperties(similar);
            } catch (err: any) {
                console.error('Failed to load property:', err);
                setError(err?.message || 'Property not found or not available.');
            } finally {
                setIsLoading(false);
            }
        }

        loadProperty();
    }, [resolvedParams.id]);

    const handleToggleSave = async () => {
        setLoadingSave(true);
        try {
            if (isSaved) {
                await unsaveProperty(resolvedParams.id);
                setIsSaved(false);
            } else {
                await saveProperty(resolvedParams.id);
                setIsSaved(true);
            }
        } catch (error) {
            // Check if it's auth error, redirect to login
            const user = await getCurrentUser().catch(() => null);
            if (!user) {
                router.push(`/login?redirect=/properties/${resolvedParams.id}`);
            } else {
                alert('Failed to update save status');
            }
        } finally {
            setLoadingSave(false);
        }
    };

    const handleScheduleTour = async () => {
        try {
            await getCurrentUser();
            setIsTourModalOpen(true);
        } catch {
            router.push(`/login?redirect=/properties/${resolvedParams.id}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 text-[#FF385C] animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-2xl mx-auto px-6 py-32 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
                    <p className="text-gray-600 mb-8">{error || 'This property may not be available or does not exist.'}</p>
                    <Link
                        href="/properties"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Browse
                    </Link>
                </div>
            </div>
        );
    }

    const TypeIcon = PROPERTY_TYPE_ICONS[property.type || ''] || Home;

    const handleStatusChange = (newStatus: string) => {
        if (property) {
            setProperty({ ...property, type: property.type }); // Trigger re-render or explicit update
            // Ideally we should reload the whole property or update the specific field
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="pt-8 pb-12">
                <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
                    {/* Back Link */}
                    <Link
                        href="/properties"
                        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#FF385C] transition-colors mb-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to listings
                    </Link>

                    {/* Admin Controls (Conditional) */}
                    {property?.id && (
                        <AdminPropertyControls
                            propertyId={property.id}
                            currentStatus={'ACTIVE'}
                            onStatusChange={handleStatusChange}
                        />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Image Gallery */}
                            <ImageGallery media={property.media} />

                            {/* Header - More Compact */}
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                        <BadgeCheck className="w-3.5 h-3.5" />
                                        Verified
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                        {property.type || 'Property'}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
                                    {property.title || 'Untitled Property'}
                                </h1>
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>
                                        {[property.address, property.city, property.state, property.pincode]
                                            .filter(Boolean)
                                            .join(', ') || 'Location not specified'}
                                    </span>
                                </div>
                            </div>

                            {/* Price & Features - Compact */}
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="text-2xl font-bold text-gray-900 mb-3">
                                    {formatPrice(property.price)}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {property.bedrooms !== null && (
                                        <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                                            <Bed className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs text-gray-500">Bedrooms</div>
                                                <div className="font-semibold text-gray-900">{property.bedrooms}</div>
                                            </div>
                                        </div>
                                    )}
                                    {property.bathrooms !== null && (
                                        <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                                            <Bath className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs text-gray-500">Bathrooms</div>
                                                <div className="font-semibold text-gray-900">{property.bathrooms}</div>
                                            </div>
                                        </div>
                                    )}
                                    {property.area_sqft !== null && (
                                        <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                                            <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs text-gray-500">Area</div>
                                                <div className="font-semibold text-gray-900 text-sm">{property.area_sqft.toLocaleString()} sqft</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                                        <TypeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs text-gray-500">Type</div>
                                            <div className="font-semibold text-gray-900">{property.type || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {property.description && (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900 mb-3">About This Property</h2>
                                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                        {property.description}
                                    </p>
                                </div>
                            )}

                            {/* Key Features / Highlights */}
                            {property.highlights && (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900 mb-3">Key Features</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {property.highlights.facing && (
                                            <div className="flex items-center gap-2">
                                                <Compass className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Facing: </span>
                                                    <span className="font-medium text-gray-900">{property.highlights.facing}</span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.floor_number !== null && (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Floor: </span>
                                                    <span className="font-medium text-gray-900">
                                                        {property.highlights.floor_number}
                                                        {property.highlights.total_floors ? ` / ${property.highlights.total_floors}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.furnishing && (
                                            <div className="flex items-center gap-2">
                                                <Sofa className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Furnishing: </span>
                                                    <span className="font-medium text-gray-900">{property.highlights.furnishing}</span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.parking_spaces !== null && (
                                            <div className="flex items-center gap-2">
                                                <CarFront className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Parking: </span>
                                                    <span className="font-medium text-gray-900">{property.highlights.parking_spaces} Spots</span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.property_age !== null && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Age: </span>
                                                    <span className="font-medium text-gray-900">{property.highlights.property_age} Years</span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.balconies !== null && (
                                            <div className="flex items-center gap-2">
                                                <LayoutTemplate className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Balconies: </span>
                                                    <span className="font-medium text-gray-900">{property.highlights.balconies}</span>
                                                </div>
                                            </div>
                                        )}
                                        {property.highlights.possession_date && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <div className="text-sm">
                                                    <span className="text-gray-500">Possession: </span>
                                                    <span className="font-medium text-gray-900">
                                                        {new Date(property.highlights.possession_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Price History */}
                            {property.price_history && property.price_history.length > 0 && (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        Price Trends
                                    </h2>
                                    <div className="space-y-3">
                                        {property.price_history.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                                <span className="text-gray-600">
                                                    {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="font-bold text-gray-900">
                                                    {formatPrice(item.price)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location Map - Compact */}
                            {property.latitude && property.longitude && (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900 mb-3">Location</h2>
                                    <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            style={{ border: 0 }}
                                            src={`https://www.google.com/maps?q=${property.latitude},${property.longitude}&hl=en&z=14&output=embed`}
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2.5 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {[property.address, property.city, property.state, property.pincode]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - More Professional & Compact */}
                        <div className="space-y-4 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {/* Owner View - Enhanced Analytics */}
                            {property.viewer?.is_owner && propertyStats && (
                                <OwnerAnalytics stats={propertyStats} />
                            )}

                            {/* Fallback owner view if stats aren't loaded */}
                            {property.viewer?.is_owner && !propertyStats && (
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 shadow-sm border border-emerald-200">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                                            <Home className="w-4.5 h-4.5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">Your Property</h3>
                                            <p className="text-xs text-emerald-700">Owner Access</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/sell/${property.id}`}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow mb-3 text-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Manage Property
                                    </Link>
                                    <p className="text-xs text-gray-600 text-center mb-3">
                                        View analytics, manage visits, and track offers.
                                    </p>
                                    <div className="flex gap-2 pt-3 border-t border-emerald-200">
                                        <button className="flex-1 py-2 px-3 border border-emerald-300 rounded-lg font-medium text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 text-sm">
                                            <Share2 className="w-4 h-4" />
                                            Share
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Agent View - Enhanced */}
                            {property.viewer?.is_agent && !property.viewer?.is_owner && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-200">
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                            <BadgeCheck className="w-4.5 h-4.5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">Assigned Property</h3>
                                            <p className="text-xs text-blue-700">Agent Access</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/agent/dashboard`}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow mb-3 text-sm"
                                    >
                                        View Agent Dashboard
                                    </Link>
                                    <p className="text-xs text-gray-600 text-center mb-3">
                                        Manage visits, respond to inquiries.
                                    </p>
                                    <div className="flex gap-2 pt-3 border-t border-blue-200">
                                        <button className="flex-1 py-2 px-3 border border-blue-300 rounded-lg font-medium text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 text-sm">
                                            <Share2 className="w-4 h-4" />
                                            Share
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Buyer View - Premium Design */}
                            {!property.viewer?.is_owner && !property.viewer?.is_agent && (
                                <>
                                    {property.agent ? (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                            <h3 className="text-base font-bold text-gray-900 mb-3">Contact Agent</h3>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                                                    <span className="text-white font-bold text-lg">
                                                        {property.agent.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{property.agent.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                                                        Verified Agent
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <a
                                                    href={`mailto:${property.agent.email}`}
                                                    className="flex items-center gap-2 text-gray-600 hover:text-[#FF385C] transition-colors text-sm"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                    <span className="text-xs">{property.agent.email}</span>
                                                </a>
                                            </div>

                                            <button
                                                onClick={handleContactAgent}
                                                disabled={isContacting}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#FF385C] text-white rounded-lg font-medium hover:bg-[#E31C5F] transition-all disabled:opacity-70 mb-2.5 shadow-sm hover:shadow text-sm"
                                            >
                                                {isContacting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Starting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="w-4 h-4" />
                                                        Chat with Agent
                                                    </>
                                                )}
                                            </button>

                                            {property.viewer?.visit_id ? (
                                                <Link
                                                    href={`/visits/${property.viewer.visit_id}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-lg font-medium hover:bg-amber-100 transition-colors mb-3 text-sm"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    Visit Requested
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={handleScheduleTour}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-[#FF385C] text-[#FF385C] rounded-lg font-medium hover:bg-red-50 transition-colors mb-3 text-sm"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Schedule Visit
                                                </button>
                                            )}

                                            {/* Save and Share - Compact */}
                                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={handleToggleSave}
                                                    disabled={loadingSave}
                                                    className={`flex-1 py-2 px-3 border rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-sm ${isSaved
                                                        ? 'border-[#FF385C] text-[#FF385C] bg-red-50 hover:bg-red-100'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {loadingSave ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                                                    )}
                                                    {isSaved ? 'Saved' : 'Save'}
                                                </button>
                                                <button className="flex-1 py-2 px-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 text-sm">
                                                    <Share2 className="w-4 h-4" />
                                                    Share
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                            <h3 className="text-base font-bold text-gray-900 mb-3">Interested?</h3>
                                            <p className="text-gray-600 text-sm mb-3">
                                                Contact us to learn more about this property.
                                            </p>
                                            <Link
                                                href="/register"
                                                className="block w-full py-2.5 bg-[#FF385C] text-white text-center rounded-lg font-medium hover:bg-[#E31C5F] transition-all mb-3 shadow-sm hover:shadow text-sm"
                                            >
                                                Sign Up to Inquire
                                            </Link>

                                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={handleToggleSave}
                                                    disabled={loadingSave}
                                                    className={`flex-1 py-2 px-3 border rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-sm ${isSaved
                                                        ? 'border-[#FF385C] text-[#FF385C] bg-red-50 hover:bg-red-100'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {loadingSave ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                                                    )}
                                                    {isSaved ? 'Saved' : 'Save'}
                                                </button>
                                                <button className="flex-1 py-2 px-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 text-sm">
                                                    <Share2 className="w-4 h-4" />
                                                    Share
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Property Insights - For all non-owners */}
                            {!property.viewer?.is_owner && (
                                <PropertyInsights
                                    price={property.price}
                                    area={property.area_sqft}
                                    stats={propertyStats}
                                />
                            )}

                            {/* EMI Calculator - For buyers when price is available */}
                            {!property.viewer?.is_owner && !property.viewer?.is_agent && property.price && (
                                <EMICalculator propertyPrice={property.price} />
                            )}
                        </div>
                    </div>

                    {/* Similar Properties Section - Full width at bottom */}
                    <SimilarPropertiesSection properties={similarProperties} />
                </div>
            </main>

            <ScheduleTourModal
                isOpen={isTourModalOpen}
                onClose={() => setIsTourModalOpen(false)}
                propertyId={property.id}
                propertyTitle={property.title || 'Property'}
            />
        </div>
    );
}
