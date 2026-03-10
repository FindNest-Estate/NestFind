'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ArrowRight,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Filter,
    IndianRupee,
    Loader2,
    MapPin,
    MessageSquare,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    User,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Send,
    X,
    Inbox,
} from 'lucide-react';
import { get, post, getImageUrl } from '@/lib/api';
import { format, formatDistanceToNow, isPast } from 'date-fns';

/* ──────────────────────────────────────────────────────── *
 *  TYPES                                                   *
 * ──────────────────────────────────────────────────────── */

interface Offer {
    id: string;
    property_id: string;
    buyer_id: string;
    offered_price: number;
    counter_price?: number;
    status: string;
    expires_at: string;
    buyer_message?: string;
    created_at: string;
    property_title?: string;
    property_price?: number;
    property_city?: string;
    thumbnail_url?: string;
    buyer_name?: string;
    buyer_email?: string;
}

interface OffersResponse {
    success: boolean;
    offers: Offer[];
    pagination: {
        page: number;
        total: number;
        total_pages: number;
    };
}

/* ──────────────────────────────────────────────────────── *
 *  STATUS CONFIG                                           *
 * ──────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, {
    color: string;
    bg: string;
    border: string;
    icon: typeof CheckCircle2;
    label: string;
}> = {
    PENDING: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, label: 'Awaiting Response' },
    ACCEPTED: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, label: 'Accepted' },
    REJECTED: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, label: 'Rejected' },
    COUNTERED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: ArrowUpRight, label: 'Countered' },
    EXPIRED: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock, label: 'Expired' },
    WITHDRAWN: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: XCircle, label: 'Withdrawn' },
};

const FILTER_OPTIONS = [
    { label: 'Needs Action', value: 'PENDING,COUNTERED' },
    { label: 'All Offers', value: '' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Expired', value: 'EXPIRED' },
];

/* ──────────────────────────────────────────────────────── *
 *  HELPERS                                                 *
 * ──────────────────────────────────────────────────────── */

const formatCurrency = (value: number | undefined | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCompact = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return formatCurrency(value);
};

/* ──────────────────────────────────────────────────────── *
 *  STAT CARD                                               *
 * ──────────────────────────────────────────────────────── */

function StatCard({
    label,
    value,
    icon: Icon,
    color,
    subtitle,
}: {
    label: string;
    value: string | number;
    icon: typeof CheckCircle2;
    color: string;
    subtitle?: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[var(--gray-500)] truncate">{label}</p>
                <p className="text-lg font-bold text-[var(--gray-900)] leading-tight">{value}</p>
                {subtitle && <p className="text-[10px] text-[var(--gray-400)]">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  PRICE COMPARISON                                        *
 * ──────────────────────────────────────────────────────── */

function PriceComparison({ offer }: { offer: Offer }) {
    const priceDiff = offer.property_price
        ? ((offer.offered_price - offer.property_price) / offer.property_price) * 100
        : 0;
    const isAbove = priceDiff >= 0;

    return (
        <div className="flex items-center gap-3">
            {/* Offered price */}
            <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--gray-400)] font-medium">Offer</p>
                <p className="text-base font-bold text-[var(--gray-900)]">
                    {formatCompact(offer.offered_price)}
                </p>
            </div>

            {/* Divider & diff */}
            {offer.property_price && (
                <>
                    <div className="flex flex-col items-center gap-0.5">
                        <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${isAbove ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                            }`}>
                            {isAbove
                                ? <ArrowUpRight className="w-3 h-3" />
                                : <ArrowDownRight className="w-3 h-3" />
                            }
                            {Math.abs(priceDiff).toFixed(1)}%
                        </div>
                    </div>

                    {/* Asking price */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--gray-400)] font-medium">Asking</p>
                        <p className="text-sm text-[var(--gray-600)]">
                            {formatCompact(offer.property_price)}
                        </p>
                    </div>
                </>
            )}

            {/* Counter price */}
            {offer.counter_price && (
                <>
                    <div className="w-px h-8 bg-[var(--gray-200)]" />
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-blue-500 font-medium">Counter</p>
                        <p className="text-sm font-semibold text-blue-600">
                            {formatCompact(offer.counter_price)}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  OFFER CARD                                              *
 * ──────────────────────────────────────────────────────── */

function OfferCard({
    offer,
    onAccept,
    onReject,
    onCounter,
    actionLoading,
}: {
    offer: Offer;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onCounter: (id: string, currentPrice: number) => void;
    actionLoading: string | null;
}) {
    const config = STATUS_CONFIG[offer.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = config.icon;
    const isPending = offer.status === 'PENDING';
    const isCountered = offer.status === 'COUNTERED';
    const canAct = isPending || isCountered;
    const isExpiringSoon = !isPast(new Date(offer.expires_at)) &&
        new Date(offer.expires_at).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;
    const isExpired = isPast(new Date(offer.expires_at));
    const isActing = actionLoading === offer.id;

    return (
        <div className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${canAct ? 'border-amber-200 hover:border-amber-300' : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'
            }`}>
            <div className="flex flex-col lg:flex-row">
                {/* Property thumbnail */}
                <div className="lg:w-44 h-28 lg:h-auto bg-[var(--gray-100)] flex-shrink-0 relative overflow-hidden">
                    <img
                        src={getImageUrl(offer.thumbnail_url) || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'}
                        alt={offer.property_title || 'Property'}
                        className="w-full h-full object-cover"
                    />
                    {/* Urgency overlay */}
                    {canAct && isExpiringSoon && !isExpired && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Expires soon
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 lg:p-5">
                    {/* Top row: status + property */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.bg} ${config.color} ${config.border}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {config.label}
                                </div>
                                {canAct && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium border border-amber-200">
                                        Action needed
                                    </span>
                                )}
                            </div>
                            <h3 className="font-semibold text-sm text-[var(--gray-900)] truncate">
                                {offer.property_title || 'Property'}
                            </h3>
                            {offer.property_city && (
                                <p className="text-xs text-[var(--gray-500)] flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {offer.property_city}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Price comparison */}
                    <div className="mb-3">
                        <PriceComparison offer={offer} />
                    </div>

                    {/* Buyer info row */}
                    <div className="flex items-center gap-4 text-[11px] text-[var(--gray-500)] mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {offer.buyer_name || 'Unknown Buyer'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(offer.created_at), 'MMM d, yyyy')}
                        </span>
                        {!isExpired && offer.expires_at && (
                            <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-red-500 font-medium' : ''}`}>
                                <Clock className="w-3 h-3" />
                                Expires {formatDistanceToNow(new Date(offer.expires_at), { addSuffix: true })}
                            </span>
                        )}
                        {isExpired && offer.status === 'PENDING' && (
                            <span className="flex items-center gap-1 text-red-500 font-medium">
                                <Clock className="w-3 h-3" />
                                Expired
                            </span>
                        )}
                    </div>

                    {/* Buyer message */}
                    {offer.buyer_message && (
                        <div className="bg-[var(--gray-50)] rounded-lg p-3 mb-3 border border-[var(--gray-100)]">
                            <p className="text-xs text-[var(--gray-600)] flex items-start gap-1.5">
                                <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-[var(--gray-400)]" />
                                <span className="italic">"{offer.buyer_message}"</span>
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    {canAct && (
                        <div className="flex items-center gap-2 pt-3 border-t border-[var(--gray-100)]">
                            <button
                                onClick={() => onAccept(offer.id)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Accept
                            </button>
                            <button
                                onClick={() => onCounter(offer.id, offer.offered_price)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 text-xs font-medium rounded-lg border border-blue-200 hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                Counter
                            </button>
                            <button
                                onClick={() => onReject(offer.id)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 text-xs font-medium rounded-lg border border-red-200 hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                            </button>
                            {isActing && (
                                <Loader2 className="w-4 h-4 animate-spin text-[var(--gray-400)] ml-1" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  COUNTER MODAL                                           *
 * ──────────────────────────────────────────────────────── */

function CounterModal({
    currentPrice,
    onSubmit,
    onClose,
    isLoading,
}: {
    currentPrice: number;
    onSubmit: (price: number) => void;
    onClose: () => void;
    isLoading: boolean;
}) {
    const [price, setPrice] = useState(currentPrice.toString());
    const parsedPrice = parseFloat(price);
    const isValid = !isNaN(parsedPrice) && parsedPrice > 0;
    const diff = isValid && currentPrice > 0
        ? ((parsedPrice - currentPrice) / currentPrice * 100)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-100)]">
                    <h3 className="text-sm font-bold text-[var(--gray-900)]">Counter Offer</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--gray-400)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Current offer */}
                    <div className="bg-[var(--gray-50)] rounded-lg p-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--gray-500)]">Buyer&apos;s offer</span>
                        <span className="text-sm font-bold text-[var(--gray-900)]">
                            {formatCurrency(currentPrice)}
                        </span>
                    </div>

                    {/* Counter input */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--gray-700)] mb-1.5">
                            Your counter price
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] text-sm font-medium">₹</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full pl-7 pr-4 py-3 border border-[var(--gray-200)] rounded-xl text-base font-semibold text-[var(--gray-900)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-[var(--gray-400)]"
                                placeholder="Enter amount"
                                autoFocus
                            />
                        </div>
                        {isValid && diff !== 0 && (
                            <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${diff > 0 ? 'text-green-600' : 'text-red-500'
                                }`}>
                                {diff > 0
                                    ? <ArrowUpRight className="w-3 h-3" />
                                    : <ArrowDownRight className="w-3 h-3" />
                                }
                                {Math.abs(diff).toFixed(1)}% {diff > 0 ? 'above' : 'below'} buyer&apos;s offer
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-[var(--gray-100)] bg-[var(--gray-50)]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => isValid && onSubmit(parsedPrice)}
                        disabled={!isValid || isLoading}
                        className="flex-1 py-2.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center gap-1.5"
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Send Counter
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  MAIN PAGE                                               *
 * ──────────────────────────────────────────────────────── */

export default function AgentOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('PENDING,COUNTERED');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [counterModal, setCounterModal] = useState<{ offerId: string; currentPrice: number } | null>(null);

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await get<OffersResponse>(`/offers?role=agent&status=${statusFilter}`);
            setOffers(response.offers || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load offers');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    /* ── Actions ── */
    const handleAccept = async (offerId: string) => {
        if (!confirm('Accept this offer? This will initiate the reservation process.')) return;
        setActionLoading(offerId);
        try {
            await post(`/offers/${offerId}/accept`);
            fetchOffers();
        } catch (err: any) {
            alert(err?.message || 'Failed to accept offer');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (offerId: string) => {
        const reason = prompt('Reason for rejection (optional):');
        if (reason === null) return; // cancelled
        setActionLoading(offerId);
        try {
            await post(`/offers/${offerId}/reject`, { reason: reason || undefined });
            fetchOffers();
        } catch (err: any) {
            alert(err?.message || 'Failed to reject offer');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCounter = async (price: number) => {
        if (!counterModal) return;
        setActionLoading(counterModal.offerId);
        try {
            await post(`/offers/${counterModal.offerId}/counter`, { counter_price: price });
            setCounterModal(null);
            fetchOffers();
        } catch (err: any) {
            alert(err?.message || 'Failed to send counter offer');
        } finally {
            setActionLoading(null);
        }
    };

    /* ── Derived data ── */
    const pendingCount = offers.filter(o => o.status === 'PENDING').length;
    const counteredCount = offers.filter(o => o.status === 'COUNTERED').length;
    const totalOfferValue = offers.reduce((sum, o) => sum + o.offered_price, 0);

    const filteredOffers = offers.filter(o => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            o.property_title?.toLowerCase().includes(q) ||
            o.buyer_name?.toLowerCase().includes(q) ||
            o.property_city?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[var(--gray-400)]" />
                        Property Offers
                    </h1>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">
                        Review and respond to buyer offers on your properties
                    </p>
                </div>
                <button
                    onClick={fetchOffers}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Stats Row ── */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard
                        label="Needs Action"
                        value={pendingCount + counteredCount}
                        icon={Clock}
                        color="bg-amber-500"
                        subtitle={pendingCount > 0 ? `${pendingCount} pending, ${counteredCount} countered` : undefined}
                    />
                    <StatCard
                        label="Total Offers"
                        value={offers.length}
                        icon={Inbox}
                        color="bg-blue-500"
                    />
                    <StatCard
                        label="Offer Value"
                        value={formatCompact(totalOfferValue)}
                        icon={IndianRupee}
                        color="bg-violet-500"
                    />
                </div>
            )}

            {/* ── Filters & Search ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gray-400)]" />
                    <input
                        type="text"
                        placeholder="Search property, buyer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] placeholder:text-[var(--gray-400)] transition-all"
                    />
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <Filter className="w-3.5 h-3.5 text-[var(--gray-400)] flex-shrink-0" />
                    {FILTER_OPTIONS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${statusFilter === f.value
                                ? 'bg-[var(--gray-900)] text-white'
                                : 'bg-white text-[var(--gray-600)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]'
                                }`}
                        >
                            {f.label}
                            {f.value === 'PENDING,COUNTERED' && (pendingCount + counteredCount) > 0 && (
                                <span className="ml-1 px-1 py-0 rounded-full bg-white/20 text-[10px]">
                                    {pendingCount + counteredCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                    <p className="text-xs text-[var(--gray-400)]">Loading offers...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    <button onClick={fetchOffers} className="mt-3 text-xs text-red-500 hover:underline">
                        Try again
                    </button>
                </div>
            ) : filteredOffers.length === 0 ? (
                <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
                    <DollarSign className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-[var(--gray-700)]">No offers found</h3>
                    <p className="text-xs text-[var(--gray-500)] mt-1">
                        {statusFilter
                            ? 'No offers match this filter. Try changing it.'
                            : 'Offers from buyers will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOffers.map((offer) => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            onAccept={handleAccept}
                            onReject={handleReject}
                            onCounter={(id, price) => setCounterModal({ offerId: id, currentPrice: price })}
                            actionLoading={actionLoading}
                        />
                    ))}
                </div>
            )}

            {/* ── Counter Modal ── */}
            {counterModal && (
                <CounterModal
                    currentPrice={counterModal.currentPrice}
                    onSubmit={handleCounter}
                    onClose={() => setCounterModal(null)}
                    isLoading={actionLoading === counterModal.offerId}
                />
            )}
        </div>
    );
}
