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
    FileText,
    Filter,
    IndianRupee,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    TrendingUp,
    Users,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Handshake,
    FileCheck,
    ShieldCheck,
    Banknote,
} from 'lucide-react';
import { getDeals } from '@/lib/api/deals';
import { getTransactions } from '@/lib/api/transactions';
import { Deal, DealStatus, DEAL_STATUS_LABELS, ACTIVE_DEAL_STATUSES, DEAL_LIFECYCLE_STEPS } from '@/lib/types/deal';
import { Transaction, TransactionStatus } from '@/lib/types/transaction';
import { format } from 'date-fns';
import Link from 'next/link';

/* ──────────────────────────────────────────────────────── *
 *  STATUS CONFIG                                          *
 * ──────────────────────────────────────────────────────── */

const DEAL_STATUS_CONFIG: Record<string, {
    color: string;
    bg: string;
    border: string;
    icon: typeof CheckCircle2;
}> = {
    INITIATED: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Clock },
    VISIT_SCHEDULED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Calendar },
    OFFER_MADE: { color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', icon: DollarSign },
    NEGOTIATION: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Handshake },
    PRICE_AGREED: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
    TOKEN_PENDING: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Banknote },
    TOKEN_PAID: { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', icon: Banknote },
    AGREEMENT_SIGNED: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: FileCheck },
    REGISTRATION: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: ShieldCheck },
    COMPLETED: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2 },
    COMMISSION_RELEASED: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: TrendingUp },
    CANCELLED: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
    EXPIRED: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock },
};

const TXN_STATUS_CONFIG: Record<string, {
    color: string;
    bg: string;
    border: string;
    icon: typeof CheckCircle2;
    label: string;
}> = {
    INITIATED: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, label: 'Pending Verification' },
    BUYER_VERIFIED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: ShieldCheck, label: 'Buyer Verified' },
    SELLER_VERIFIED: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: ShieldCheck, label: 'Seller Verified' },
    COMPLETED: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, label: 'Completed' },
    FAILED: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, label: 'Failed' },
    CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: XCircle, label: 'Cancelled' },
};

const STATUS_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Active', value: '__active__' },
    { label: 'Negotiation', value: 'NEGOTIATION' },
    { label: 'Price Agreed', value: 'PRICE_AGREED' },
    { label: 'Token Pending', value: 'TOKEN_PENDING' },
    { label: 'Registration', value: 'REGISTRATION' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

/* ──────────────────────────────────────────────────────── *
 *  HELPERS                                                *
 * ──────────────────────────────────────────────────────── */

const formatCurrency = (value: number | undefined | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const getStepIndex = (status: string) => {
    const idx = DEAL_LIFECYCLE_STEPS.indexOf(status as DealStatus);
    return idx >= 0 ? idx : -1;
};

/* ──────────────────────────────────────────────────────── *
 *  DEAL PROGRESS BAR                                       *
 * ──────────────────────────────────────────────────────── */

function DealProgressBar({ status }: { status: string }) {
    const steps = DEAL_LIFECYCLE_STEPS;
    const currentIdx = getStepIndex(status);
    const isTerminal = status === 'CANCELLED' || status === 'EXPIRED';
    const progress = isTerminal ? 0 : currentIdx >= 0 ? ((currentIdx + 1) / steps.length) * 100 : 0;

    return (
        <div className="w-full">
            <div className="h-1.5 rounded-full bg-[var(--gray-100)] overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isTerminal
                            ? 'bg-red-300'
                            : status === 'COMPLETED' || status === 'COMMISSION_RELEASED'
                                ? 'bg-green-500'
                                : 'bg-[var(--color-brand)]'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  STAT CARD                                               *
 * ──────────────────────────────────────────────────────── */

function StatCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: typeof CheckCircle2;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[var(--gray-500)] truncate">{label}</p>
                <p className="text-lg font-bold text-[var(--gray-900)] leading-tight">{value}</p>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  DEAL CARD (AGENT VARIANT)                               *
 * ──────────────────────────────────────────────────────── */

function AgentDealCard({ deal }: { deal: Deal }) {
    const config = DEAL_STATUS_CONFIG[deal.status] || DEAL_STATUS_CONFIG.INITIATED;
    const StatusIcon = config.icon;
    const isActive = ACTIVE_DEAL_STATUSES.has(deal.status as DealStatus);

    return (
        <Link href={`/deals/${deal.id}`}>
            <div className="bg-white rounded-xl border border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:shadow-md transition-all group cursor-pointer overflow-hidden">
                {/* Progress bar */}
                <DealProgressBar status={deal.status} />

                <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 className="w-4 h-4 text-[var(--gray-400)] flex-shrink-0" />
                                <h3 className="font-semibold text-sm text-[var(--gray-900)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                    {deal.property_title}
                                </h3>
                            </div>
                            {deal.property_city && (
                                <p className="text-xs text-[var(--gray-500)] ml-6 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {deal.property_city}
                                    {deal.property_type && <span className="text-[var(--gray-300)]">•</span>}
                                    {deal.property_type && <span className="capitalize">{deal.property_type.toLowerCase()}</span>}
                                </p>
                            )}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border} flex-shrink-0`}>
                            <StatusIcon className="w-3 h-3" />
                            {deal.display_status || DEAL_STATUS_LABELS[deal.status as DealStatus] || deal.status}
                        </div>
                    </div>

                    {/* Financial & participants */}
                    <div className="flex items-center gap-5 text-xs text-[var(--gray-600)] mb-3 ml-6">
                        {deal.agreed_price && (
                            <span className="flex items-center gap-1 font-semibold text-[var(--gray-900)]">
                                <IndianRupee className="w-3 h-3" />
                                {deal.agreed_price.toLocaleString('en-IN')}
                            </span>
                        )}
                        {deal.agent_commission && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                {formatCurrency(deal.agent_commission)} commission
                            </span>
                        )}
                    </div>

                    {/* Parties row */}
                    <div className="flex items-center gap-3 text-[11px] text-[var(--gray-500)] ml-6 flex-wrap">
                        {deal.buyer_name && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Buyer: <span className="text-[var(--gray-700)] font-medium">{deal.buyer_name}</span>
                            </span>
                        )}
                        {deal.seller_name && (
                            <>
                                <span className="text-[var(--gray-300)]">•</span>
                                <span>
                                    Seller: <span className="text-[var(--gray-700)] font-medium">{deal.seller_name}</span>
                                </span>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--gray-100)] ml-6">
                        <div className="flex items-center gap-3 text-[11px] text-[var(--gray-400)]">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(deal.created_at), 'MMM d, yyyy')}
                            </span>
                            {deal.registration_date && (
                                <span className="flex items-center gap-1 text-purple-500">
                                    <Calendar className="w-3 h-3" />
                                    Reg: {format(new Date(deal.registration_date), 'MMM d')}
                                </span>
                            )}
                            {isActive && deal.allowed_actions && deal.allowed_actions.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium border border-amber-200">
                                    {deal.allowed_actions.length} action{deal.allowed_actions.length > 1 ? 's' : ''} pending
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-[var(--color-brand)] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  REGISTRATION CARD                                       *
 * ──────────────────────────────────────────────────────── */

function RegistrationCard({ txn }: { txn: Transaction }) {
    const config = TXN_STATUS_CONFIG[txn.status] || TXN_STATUS_CONFIG.INITIATED;
    const StatusIcon = config.icon;

    return (
        <Link href={`/agent/transactions/${txn.id}`}>
            <div className="bg-white rounded-xl border border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:shadow-md transition-all group cursor-pointer p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-[var(--gray-400)] flex-shrink-0" />
                            <h3 className="font-semibold text-sm text-[var(--gray-900)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                {txn.property_title || 'Registration'}
                            </h3>
                        </div>
                        {txn.property_city && (
                            <p className="text-xs text-[var(--gray-500)] ml-6 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {txn.property_city}
                            </p>
                        )}
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border} flex-shrink-0`}>
                        <StatusIcon className="w-3 h-3" />
                        {txn.display_status || config.label}
                    </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-5 text-xs text-[var(--gray-600)] mb-3 ml-6">
                    {txn.total_price && (
                        <span className="flex items-center gap-1 font-semibold text-[var(--gray-900)]">
                            <IndianRupee className="w-3 h-3" />
                            {txn.total_price.toLocaleString('en-IN')}
                        </span>
                    )}
                    {txn.agent_commission && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                            <TrendingUp className="w-3 h-3" />
                            {formatCurrency(txn.agent_commission)} commission
                        </span>
                    )}
                </div>

                {/* Parties */}
                <div className="flex items-center gap-3 text-[11px] text-[var(--gray-500)] ml-6 flex-wrap">
                    {txn.buyer_name && (
                        <span>Buyer: <span className="text-[var(--gray-700)] font-medium">{txn.buyer_name}</span></span>
                    )}
                    {txn.seller_name && (
                        <>
                            <span className="text-[var(--gray-300)]">•</span>
                            <span>Seller: <span className="text-[var(--gray-700)] font-medium">{txn.seller_name}</span></span>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--gray-100)] ml-6">
                    <div className="flex items-center gap-3 text-[11px] text-[var(--gray-400)]">
                        {txn.registration_date && (
                            <span className="flex items-center gap-1 text-purple-500">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(txn.registration_date), 'MMM d, yyyy')}
                            </span>
                        )}
                        {txn.registration_location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {txn.registration_location}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(txn.created_at), 'MMM d, yyyy')}
                        </span>
                    </div>
                    <span className="text-xs text-[var(--color-brand)] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

/* ──────────────────────────────────────────────────────── *
 *  MAIN PAGE COMPONENT                                     *
 * ──────────────────────────────────────────────────────── */

type TabKey = 'deals' | 'registrations';

export default function AgentTransactionsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('deals');
    const [deals, setDeals] = useState<Deal[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Stats
    const [activeDeals, setActiveDeals] = useState(0);
    const [completedDeals, setCompletedDeals] = useState(0);
    const [totalCommission, setTotalCommission] = useState(0);

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const opts: { status?: string; active_only?: boolean; page: number; per_page: number } = {
                page,
                per_page: 20,
            };
            if (statusFilter === '__active__') {
                opts.active_only = true;
            } else if (statusFilter) {
                opts.status = statusFilter;
            }

            const data = await getDeals(opts);
            setDeals(data.deals || []);
            setTotalPages(data.pagination.total_pages);
            setTotalCount(data.pagination.total);

            // Compute stats from all deals
            const active = (data.deals || []).filter(d => ACTIVE_DEAL_STATUSES.has(d.status as DealStatus)).length;
            const completed = (data.deals || []).filter(d => d.status === 'COMPLETED' || d.status === 'COMMISSION_RELEASED').length;
            const commission = (data.deals || []).reduce((sum, d) => sum + (d.agent_commission || 0), 0);
            setActiveDeals(active);
            setCompletedDeals(completed);
            setTotalCommission(commission);
        } catch (err: any) {
            setError(err?.message || 'Failed to load deals');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTransactions(statusFilter || undefined, page, 20);
            setTransactions(data.transactions || []);
            setTotalPages(data.pagination?.total_pages || 0);
            setTotalCount(data.pagination?.total || 0);
        } catch (err: any) {
            setError(err?.message || 'Failed to load registrations');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => {
        if (activeTab === 'deals') {
            fetchDeals();
        } else {
            fetchTransactions();
        }
    }, [activeTab, fetchDeals, fetchTransactions]);

    // Reset page on tab or filter change
    useEffect(() => {
        setPage(1);
    }, [activeTab, statusFilter]);

    const handleRefresh = () => {
        if (activeTab === 'deals') {
            fetchDeals();
        } else {
            fetchTransactions();
        }
    };

    // Filter items by search query (client-side)
    const filteredDeals = deals.filter(d => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            d.property_title?.toLowerCase().includes(q) ||
            d.buyer_name?.toLowerCase().includes(q) ||
            d.seller_name?.toLowerCase().includes(q) ||
            d.property_city?.toLowerCase().includes(q)
        );
    });

    const filteredTransactions = transactions.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.property_title?.toLowerCase().includes(q) ||
            t.buyer_name?.toLowerCase().includes(q) ||
            t.seller_name?.toLowerCase().includes(q) ||
            t.property_city?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[var(--gray-400)]" />
                        Transactions
                    </h1>
                    <p className="text-xs text-[var(--gray-500)] mt-0.5">
                        Manage deals, registrations, and closings
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray-600)] bg-white border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Stats Row ── */}
            {activeTab === 'deals' && !loading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard
                        label="Active Deals"
                        value={activeDeals}
                        icon={Handshake}
                        color="bg-blue-500"
                    />
                    <StatCard
                        label="Completed"
                        value={completedDeals}
                        icon={CheckCircle2}
                        color="bg-green-500"
                    />
                    <StatCard
                        label="Commission Earned"
                        value={formatCurrency(totalCommission)}
                        icon={TrendingUp}
                        color="bg-violet-500"
                    />
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('deals')}
                    className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeTab === 'deals'
                            ? 'bg-white text-[var(--gray-900)] shadow-sm'
                            : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
                        }`}
                >
                    <Handshake className="w-3.5 h-3.5 inline mr-1.5" />
                    Deals
                </button>
                <button
                    onClick={() => setActiveTab('registrations')}
                    className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeTab === 'registrations'
                            ? 'bg-white text-[var(--gray-900)] shadow-sm'
                            : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
                        }`}
                >
                    <FileCheck className="w-3.5 h-3.5 inline mr-1.5" />
                    Registrations
                </button>
            </div>

            {/* ── Filters & Search ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--gray-400)]" />
                    <input
                        type="text"
                        placeholder="Search by property, buyer, seller..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] placeholder:text-[var(--gray-400)] transition-all"
                    />
                </div>

                {/* Status filter pills (deals tab only) */}
                {activeTab === 'deals' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <Filter className="w-3.5 h-3.5 text-[var(--gray-400)] flex-shrink-0" />
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${statusFilter === f.value
                                        ? 'bg-[var(--gray-900)] text-white'
                                        : 'bg-white text-[var(--gray-600)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                    <p className="text-xs text-[var(--gray-400)]">Loading...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    <button onClick={handleRefresh} className="mt-3 text-xs text-red-500 hover:underline">
                        Try again
                    </button>
                </div>
            ) : activeTab === 'deals' ? (
                /* Deals list */
                filteredDeals.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
                        <Handshake className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-[var(--gray-700)]">No deals found</h3>
                        <p className="text-xs text-[var(--gray-500)] mt-1">
                            {statusFilter ? 'Try changing the filter' : 'Deals will appear when buyers initiate them on your properties'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredDeals.map((deal) => (
                            <AgentDealCard key={deal.id} deal={deal} />
                        ))}
                    </div>
                )
            ) : (
                /* Registrations list */
                filteredTransactions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[var(--gray-200)] p-12 text-center">
                        <FileCheck className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-[var(--gray-700)]">No registrations found</h3>
                        <p className="text-xs text-[var(--gray-500)] mt-1">
                            Registrations appear after scheduling them for reserved properties
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTransactions.map((txn) => (
                            <RegistrationCard key={txn.id} txn={txn} />
                        ))}
                    </div>
                )
            )}

            {/* ── Pagination ── */}
            {!loading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-[var(--gray-200)] px-4 py-3">
                    <p className="text-xs text-[var(--gray-500)]">
                        Showing page <span className="font-medium text-[var(--gray-700)]">{page}</span> of{' '}
                        <span className="font-medium text-[var(--gray-700)]">{totalPages}</span>
                        <span className="text-[var(--gray-400)] ml-2">
                            ({totalCount} total)
                        </span>
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--gray-200)] rounded-lg disabled:opacity-40 hover:bg-[var(--gray-50)] transition"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--gray-200)] rounded-lg disabled:opacity-40 hover:bg-[var(--gray-50)] transition"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
