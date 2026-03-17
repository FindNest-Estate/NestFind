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
    Activity,
    DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/auth/types';
import { getPropertyDetail, PropertyDetail } from '@/lib/api/public';
import { post } from '@/lib/api';
import AdminPropertyControls from '@/components/admin/AdminPropertyControls';
import { saveProperty, unsaveProperty, checkIfSaved } from '@/lib/propertiesApi';
import ScheduleTourModal from '@/components/property/ScheduleTourModal';
import MakeOfferModal from '@/components/offers/MakeOfferModal';
import {
    getPropertyStats,
    getSimilarProperties,
    recordPropertyView,
    PropertyStats,
    SimilarProperty
} from '@/lib/api/propertyStats';
import { getImageUrl } from '@/lib/api';

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
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <Calculator className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">EMI Calculator</h3>
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
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100 mt-6 group hover:shadow-md transition-all">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-sm">
                    <Sparkles className="w-5 h-5" />
                </div>
                Property Insights
            </h3>
            <div className="space-y-3">
                {pricePerSqft && (
                    <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100 group-hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <IndianRupee className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Price per sq.ft</span>
                        </div>
                        <span className="font-bold text-gray-900 text-base">₹{formatIndianNumber(pricePerSqft)}</span>
                    </div>
                )}
                {stats && (
                    <>
                        <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100 group-hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-600">Days on Market</span>
                            </div>
                            <span className="font-bold text-gray-900 text-base">{stats.days_on_market} days</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100 group-hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-600">Total Views</span>
                            </div>
                            <span className="font-bold text-gray-900 text-base">{stats.total_views}</span>
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
        <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] rounded-xl text-white shadow-sm">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    Similar Properties You Might Like
                </h2>
                <Link href="/properties" className="hidden sm:flex items-center gap-2 text-[#FF385C] font-semibold hover:text-[#E31C5F] transition-colors">
                    View more <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.slice(0, 6).map((prop) => (
                    <Link
                        key={prop.id}
                        href={`/properties/${prop.id}`}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                            {prop.thumbnail_url ? (
                                <img
                                    src={getImageUrl(prop.thumbnail_url)}
                                    alt={prop.title || 'Property'}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Home className="w-12 h-12 text-gray-300" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute top-4 left-4">
                                <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md text-gray-900 rounded-lg text-xs font-bold shadow-sm">
                                    {prop.type}
                                </span>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-[#FF385C] transition-colors">
                                    {formatPrice(prop.price)}
                                </h3>
                            </div>
                            <div className="text-sm text-gray-500 mb-4 flex items-center gap-1.5 line-clamp-1 h-5">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                {prop.city}
                            </div>
                            {(prop.bedrooms || prop.bathrooms || prop.area_sqft) && (
                                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                                    {prop.bedrooms && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                                            <Bed className="w-4 h-4 text-gray-400" />
                                            {prop.bedrooms} Bed
                                        </div>
                                    )}
                                    {prop.bathrooms && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                                            <Bath className="w-4 h-4 text-gray-400" />
                                            {prop.bathrooms} Bath
                                        </div>
                                    )}
                                    {prop.area_sqft && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                                            <Square className="w-4 h-4 text-gray-400" />
                                            {prop.area_sqft.toLocaleString()} sqft
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
            <Link href="/properties" className="mt-8 flex sm:hidden items-center justify-center gap-2 w-full py-4 bg-gray-50 text-gray-900 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors">
                View more properties <ArrowUpRight className="w-4 h-4" />
            </Link>
        </div>
    );
}


function ImageGallery({ media }: { media: PropertyDetail['media'] }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    if (media.length === 0) {
        return (
            <div className="aspect-[2/1] md:aspect-[21/9] bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center border border-gray-200/50">
                <Home className="w-20 h-20 text-gray-300" />
            </div>
        );
    }

    const currentImage = media[selectedIndex];

    // Show 1 image on mobile, up to 5 on desktop
    const displayMedia = media.slice(0, 5);

    return (
        <>
            <div className="relative group">
                {/* Desktop Grid Layout (Airbnb style) */}
                <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[50vh] min-h-[400px] max-h-[600px] rounded-2xl overflow-hidden">
                    {/* Main large image */}
                    <div 
                        className={`col-span-2 row-span-2 relative cursor-pointer overflow-hidden ${media.length === 1 ? 'col-span-4' : ''}`}
                        onClick={() => {
                            setSelectedIndex(0);
                            setIsLightboxOpen(true);
                        }}
                    >
                        <img
                            src={getImageUrl(displayMedia[0].file_url)}
                            alt="Property main view"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </div>

                    {/* Smaller images grid */}
                    {displayMedia.slice(1).map((img, idx) => (
                        <div 
                            key={img.id} 
                            className="relative cursor-pointer overflow-hidden"
                            onClick={() => {
                                setSelectedIndex(idx + 1);
                                setIsLightboxOpen(true);
                            }}
                        >
                            <img
                                src={getImageUrl(img.file_url)}
                                alt={`Property view ${idx + 2}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        </div>
                    ))}
                </div>

                {/* Mobile Single Image Layout */}
                <div 
                    className="md:hidden relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <img
                        src={getImageUrl(displayMedia[0].file_url)}
                        alt="Property main view"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Show All Photos Button */}
                <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg font-medium text-sm text-gray-900 shadow-sm border border-gray-200/50 hover:bg-white transition-all flex items-center gap-2"
                >
                    <LayoutTemplate className="w-4 h-4" />
                    Show all photos
                </button>
            </div>

            {/* Lightbox Overlay */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <div className="text-sm font-medium">
                            {selectedIndex + 1} / {media.length}
                        </div>
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Image View */}
                    <div className="flex-1 relative flex items-center justify-center p-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
                            }}
                            className="absolute left-4 md:left-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
                        >
                            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                        </button>
                        
                        <img
                            src={getImageUrl(currentImage.file_url)}
                            alt={`Preview ${selectedIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-4 md:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
                        >
                            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                        </button>
                    </div>

                    {/* Thumbnail Strip */}
                    {media.length > 1 && (
                        <div className="p-4 bg-black/50 overflow-x-auto">
                            <div className="flex gap-2 justify-start md:justify-center min-w-min mx-auto px-4">
                                {media.map((img, idx) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all ${
                                            idx === selectedIndex 
                                                ? 'ring-2 ring-white scale-105 opacity-100 z-10' 
                                                : 'opacity-50 hover:opacity-100'
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
                        </div>
                    )}
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
    const { user } = useAuth();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isContacting, setIsContacting] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

    // Property Stats
    const [propertyStats, setPropertyStats] = useState<PropertyStats | null>(null);
    const [similarProperties, setSimilarProperties] = useState<SimilarProperty[]>([]);

    const handleContactAgent = async () => {
        if (!property?.agent) return;

        if (!user) {
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
            if (!user) {
                router.push(`/login?redirect=/properties/${resolvedParams.id}`);
            } else {
                alert('Failed to update save status');
            }
        } finally {
            setLoadingSave(false);
        }
    };

    const handleScheduleTour = () => {
        if (!user) {
            router.push(`/login?redirect=/properties/${resolvedParams.id}`);
            return;
        }
        setIsTourModalOpen(true);
    };

    const handleMakeOffer = () => {
        if (!user) {
            router.push(`/login?redirect=/properties/${resolvedParams.id}`);
            return;
        }
        setIsOfferModalOpen(true);
    };

    // Show Make Offer CTA only for authenticated buyers on active properties
    const canMakeOffer = user?.roles?.includes(UserRole.BUYER)
        && !property?.viewer?.is_owner
        && !property?.viewer?.is_agent
        && property?.status === 'ACTIVE';

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

                            {/* Header - Glassmorphic */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/60 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                                
                                <div className="relative z-10">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5">
                                            <BadgeCheck className="w-3.5 h-3.5" />
                                            Verified Listing
                                        </span>
                                        <span className="px-3 py-1 bg-gray-900 text-white rounded-full text-xs font-semibold shadow-sm">
                                            {property.type || 'Property'}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 mb-2 leading-tight">
                                        {property.title || 'Untitled Property'}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                        <div className="p-1.5 bg-gray-100 rounded-full">
                                            <MapPin className="w-4 h-4 text-gray-700" />
                                        </div>
                                        <span>
                                            {[property.address, property.city, property.state, property.pincode]
                                                .filter(Boolean)
                                                .join(', ') || 'Location not specified'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Price & Primary Specs - Glassmorphic Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-emerald-100/50 flex flex-col justify-center">
                                    <div className="text-sm font-semibold text-emerald-700 mb-1 uppercase tracking-wider">Asking Price</div>
                                    <div className="text-3xl font-black text-gray-900 flex items-center gap-1">
                                        {formatPrice(property.price)}
                                    </div>
                                    {property.price_negotiable !== undefined && (
                                        <div className="text-xs text-gray-500 mt-2 font-medium">
                                            {property.price_negotiable ? 'Negotiable Price' : 'Fixed Price'}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {property.bedrooms !== null && (
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors group">
                                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                                                <Bed className="w-5 h-5" />
                                            </div>
                                            <div className="font-bold text-gray-900">{property.bedrooms} Beds</div>
                                        </div>
                                    )}
                                    {property.bathrooms !== null && (
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-cyan-200 transition-colors group">
                                            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                                                <Bath className="w-5 h-5" />
                                            </div>
                                            <div className="font-bold text-gray-900">{property.bathrooms} Baths</div>
                                        </div>
                                    )}
                                    {property.area_sqft !== null && (
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-purple-200 transition-colors group">
                                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                                                <Square className="w-5 h-5" />
                                            </div>
                                            <div className="font-bold text-gray-900">{property.area_sqft.toLocaleString()} <span className="text-xs text-gray-500 font-normal">sq.ft</span></div>
                                        </div>
                                    )}
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-orange-200 transition-colors group">
                                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                                            <TypeIcon className="w-5 h-5" />
                                        </div>
                                        <div className="font-bold text-gray-900">{property.type || 'Property'}</div>
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

                            {/* Key Features / Highlights - Glassmorphic Detail Overview */}
                            {property.highlights && (
                                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        Property Details
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                                        {property.highlights.facing && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> Facing</span>
                                                <span className="font-bold text-gray-900">{property.highlights.facing}</span>
                                            </div>
                                        )}
                                        {property.highlights.floor_number !== null && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Floor Level</span>
                                                <span className="font-bold text-gray-900">
                                                    {property.highlights.floor_number}
                                                    {property.highlights.total_floors ? ` of ${property.highlights.total_floors}` : ''}
                                                </span>
                                            </div>
                                        )}
                                        {property.highlights.furnishing && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Sofa className="w-3.5 h-3.5" /> Furnishing</span>
                                                <span className="font-bold text-gray-900">{property.highlights.furnishing}</span>
                                            </div>
                                        )}
                                        {property.highlights.parking_spaces !== null && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CarFront className="w-3.5 h-3.5" /> Parking</span>
                                                <span className="font-bold text-gray-900">{property.highlights.parking_spaces} Space{property.highlights.parking_spaces > 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        {property.highlights.property_age !== null && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Property Age</span>
                                                <span className="font-bold text-gray-900">{property.highlights.property_age} Year{property.highlights.property_age > 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        {property.highlights.balconies !== null && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><LayoutTemplate className="w-3.5 h-3.5" /> Balconies</span>
                                                <span className="font-bold text-gray-900">{property.highlights.balconies}</span>
                                            </div>
                                        )}
                                        {property.highlights.possession_date && (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Possession</span>
                                                <span className="font-bold text-gray-900">
                                                    {new Date(property.highlights.possession_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                </span>
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
                                    {/* Make Offer CTA — Primary */}
                                    {canMakeOffer && (
                                        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-6 shadow-lg border border-emerald-400 mb-6 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                                <FileText className="w-32 h-32" />
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="text-lg font-black text-white mb-2">Ready to move forward?</h3>
                                                <p className="text-emerald-50 text-sm font-medium mb-5 leading-relaxed">Submit a formal offer to start the negotiation process with the seller.</p>
                                                <button
                                                    onClick={handleMakeOffer}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm"
                                                >
                                                    <DollarSign className="w-5 h-5" />
                                                    Make an Offer
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Make Offer CTA — Disabled (non-active property) */}
                                    {user?.roles?.includes(UserRole.BUYER) && !property.viewer?.is_owner && !property.viewer?.is_agent && property.status !== 'ACTIVE' && (
                                        <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
                                            <button
                                                disabled
                                                title="This property is not currently accepting offers"
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed text-sm"
                                            >
                                                <DollarSign className="w-4 h-4" />
                                                Make an Offer
                                            </button>
                                            <p className="text-xs text-gray-500 text-center mt-2">This property is not currently accepting offers</p>
                                        </div>
                                    )}

                                    {property.agent ? (
                                        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100">
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Agent</h3>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md transform rotate-3 hover:rotate-0 transition-transform">
                                                    <span className="text-white font-bold text-xl">
                                                        {property.agent.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base">{property.agent.name}</div>
                                                    <div className="text-xs font-medium text-blue-600 flex items-center gap-1.5 mt-0.5">
                                                        <BadgeCheck className="w-4 h-4" />
                                                        Verified Agent
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <a
                                                    href={`mailto:${property.agent.email}`}
                                                    className="flex items-center gap-3 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
                                                >
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <span className="truncate">{property.agent.email}</span>
                                                </a>
                                            </div>

                                            <button
                                                onClick={handleContactAgent}
                                                disabled={isContacting}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-bold hover:from-gray-800 hover:to-gray-700 transition-all disabled:opacity-70 mb-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm"
                                            >
                                                {isContacting ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Starting Chat...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="w-5 h-5" />
                                                        Chat with Agent
                                                    </>
                                                )}
                                            </button>

                                            {property.viewer?.visit_id ? (
                                                <Link
                                                    href={`/visits/${property.viewer.visit_id}`}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition-colors mb-4 text-sm"
                                                >
                                                    <Clock className="w-5 h-5" />
                                                    {property.viewer.visit_status === 'REQUESTED' ? 'Request Sent' :
                                                        property.viewer.visit_status === 'APPROVED' ? 'Visit Scheduled' :
                                                            property.viewer.visit_status === 'COMPLETED' ? 'Visit Completed' :
                                                                property.viewer.visit_status === 'CHECKED_IN' ? 'Visit In Progress' :
                                                                    property.viewer.visit_status === 'NO_SHOW' ? 'Visit Missed' :
                                                                        property.viewer.visit_status === 'COUNTERED' ? 'Counter Offer' : 'Visit Requested'}
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={handleScheduleTour}
                                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-bold hover:border-gray-900 hover:bg-gray-50 transition-colors mb-4 text-sm"
                                                >
                                                    <Calendar className="w-5 h-5" />
                                                    Schedule Visit
                                                </button>
                                            )}

                                            {/* Save and Share */}
                                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={handleToggleSave}
                                                    disabled={loadingSave}
                                                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${isSaved
                                                        ? 'bg-red-50 text-[#FF385C] border-2 border-red-100 ring-4 ring-red-50'
                                                        : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {loadingSave ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                                                    )}
                                                    {isSaved ? 'Saved' : 'Save'}
                                                </button>
                                                <button className="flex-1 py-3 px-4 bg-white border-2 border-gray-100 rounded-xl font-bold text-gray-600 hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm">
                                                    <Share2 className="w-4 h-4" />
                                                    Share
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm border border-gray-100">
                                            <div className="text-center mb-5">
                                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Heart className="w-8 h-8 text-[#FF385C]" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">Interested?</h3>
                                                <p className="text-gray-500 text-sm">
                                                    Create an account to contact the agent, schedule a visit, or make an offer.
                                                </p>
                                            </div>
                                            <Link
                                                href="/register"
                                                className="block w-full py-3.5 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white text-center rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all mb-4 text-sm"
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
                onSuccess={(visitId) => {
                    if (property) {
                        setProperty({
                            ...property,
                            viewer: {
                                is_owner: property.viewer?.is_owner || false,
                                is_agent: property.viewer?.is_agent || false,
                                ...property.viewer,
                                visit_id: visitId,
                                visit_status: 'REQUESTED'
                            }
                        });
                    }
                    setIsTourModalOpen(false);
                }}
                propertyId={property.id}
                propertyTitle={property.title || 'Property'}
            />

            <MakeOfferModal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                onSuccess={() => {
                    setIsOfferModalOpen(false);
                    router.push('/offers');
                }}
                propertyId={property.id}
                propertyTitle={property.title || 'Property'}
                propertyPrice={property.price || 0}
            />
        </div>
    );
}
