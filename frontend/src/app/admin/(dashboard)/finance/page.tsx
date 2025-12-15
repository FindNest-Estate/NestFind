'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
    Download,
    Filter,
    Search,
    CheckCircle,
    Clock,
    FileText,
    TrendingUp,
    DollarSign,
    Briefcase,
    Building,
    ExternalLink,
    AlertCircle,
    RefreshCw,
    Mail,
    ChevronRight,
    ShieldCheck,
    Banknote
} from 'lucide-react';
import { toast } from 'sonner';

export default function DealSettlementDashboard() {
    const [activeTab, setActiveTab] = useState<'settlements' | 'overview' | 'transactions'>('settlements');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data States
    const [settlements, setSettlements] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [settlementData, summaryData, transData] = await Promise.all([
                api.admin.getDealSettlements(),
                api.admin.getFinancialSummary(),
                api.admin.getDealPayments()
            ]);
            setSettlements(settlementData);
            setSummary(summaryData);
            setTransactions(transData);
        } catch (error) {
            console.error("Failed to fetch financial data", error);
            toast.error("Failed to update dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Real-time polling every 10 seconds
        const interval = setInterval(() => fetchData(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const handleVerifyDocument = async (type: string, id: number, status: string) => {
        try {
            await api.admin.verifyDocument(type, id, status);
            toast.success(`${type.replace('_', ' ')} ${status.toLowerCase()} successfully`);
            fetchData(true);
        } catch (error) {
            toast.error("Verification failed");
        }
    };



    const handleGenerateDeed = async (offerId: number) => {
        try {
            await api.offers.generateSaleDeed(offerId);
            toast.success("Sale Deed generated successfully");
            fetchData(true);
        } catch (error) {
            toast.error("Failed to generate Sale Deed");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getFileUrl = (path: string) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${api.API_URL}/${cleanPath}`;
    };

    // Modal State
    const [showDisburseModal, setShowDisburseModal] = useState(false);
    const [selectedCommissionId, setSelectedCommissionId] = useState<number | null>(null);
    const [transactionRef, setTransactionRef] = useState("");
    const [disburseLoading, setDisburseLoading] = useState(false);

    const openDisburseModal = (commissionId: number) => {
        setSelectedCommissionId(commissionId);
        setTransactionRef("");
        setShowDisburseModal(true);
    };

    const handleConfirmDisburse = async () => {
        if (!selectedCommissionId || !transactionRef) {
            toast.error("Please enter a transaction reference");
            return;
        }

        setDisburseLoading(true);
        try {
            await api.admin.disburseCommission(selectedCommissionId, transactionRef);
            toast.success("Commission disbursed successfully");
            setShowDisburseModal(false);
            fetchData(true);
        } catch (error) {
            toast.error("Disbursement failed");
        } finally {
            setDisburseLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Deal Settlement Dashboard
                        {refreshing && <RefreshCw className="animate-spin text-gray-400" size={16} />}
                    </h1>
                    <p className="text-gray-500">Real-time verification and settlement of property deals.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('settlements')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'settlements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ShieldCheck size={16} />
                        Active Settlements
                    </button>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TrendingUp size={16} />
                        Financial Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Banknote size={16} />
                        All Transactions
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <RefreshCw className="animate-spin mb-4" size={32} />
                    <p>Loading market data...</p>
                </div>
            ) : (
                <>
                    {/* SETTLEMENTS TAB (MAIN WORKFLOW) */}
                    {activeTab === 'settlements' && (
                        <div className="space-y-6">
                            {settlements.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                    <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                                    <p className="text-gray-500">No active deals require settlement at the moment.</p>
                                </div>
                            ) : (
                                settlements.map((property) => (
                                    <div key={property.property_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        {/* Property Header */}
                                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden">
                                                    {property.property_image ? (
                                                        <img src={getFileUrl(property.property_image)} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Building className="h-full w-full p-3 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                        {property.property_title}
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-mono">PROP-{property.property_id}</span>
                                                    </h3>
                                                    <p className="text-sm text-gray-500">{property.property_address}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right mr-4">
                                                    <p className="text-xs text-gray-500">Listing Agent</p>
                                                    <p className="font-medium text-gray-900">{property.agent_name}</p>
                                                </div>
                                                <a href={`mailto:${property.agent_email}?subject=Regarding Settlement for ${property.property_title}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                                    <Mail size={20} />
                                                </a>
                                            </div>
                                        </div>

                                        {/* Offers / Deals List */}
                                        <div className="divide-y divide-gray-100">
                                            {property.offers.map((offer: any) => (
                                                <div key={offer.offer_id} className="p-6">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                                Offer from {offer.buyer_name}
                                                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-mono">OFFER-{offer.offer_id}</span>
                                                            </h4>
                                                            <p className="text-sm text-gray-500 mt-1">Deal Value: <span className="font-bold text-gray-900">{formatCurrency(offer.amount)}</span></p>
                                                        </div>
                                                        <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center gap-1">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                            Live Deal
                                                        </div>
                                                    </div>

                                                    {/* Workflow Steps */}
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        {/* Step 1: Booking Token */}
                                                        <div className={`p-4 rounded-lg border ${offer.token_payment?.status === 'VERIFIED' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-bold uppercase text-gray-500">Step 1</span>
                                                                {offer.token_payment?.status === 'VERIFIED' ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-yellow-500" />}
                                                            </div>
                                                            <h5 className="font-bold text-gray-900 mb-1">Booking Token</h5>
                                                            <p className="text-xs text-gray-500 mb-3">0.1% Platform Fee</p>

                                                            {offer.token_payment ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Amount:</span>
                                                                        <span className="font-medium">{formatCurrency(offer.token_payment.amount)}</span>
                                                                    </div>

                                                                    <div className="flex gap-2 mt-2">
                                                                        <a href={getFileUrl(offer.token_payment.proof_file_url)} target="_blank" className="flex-1 py-1.5 text-xs text-center border border-gray-300 rounded hover:bg-gray-50 bg-white">View Receipt</a>
                                                                        {offer.token_payment.status !== 'VERIFIED' && (
                                                                            <button
                                                                                onClick={() => handleVerifyDocument('token_receipt', offer.token_payment.id, 'VERIFIED')}
                                                                                className="flex-1 py-1.5 text-xs text-center bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                                            >
                                                                                Verify
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic">Waiting for payment...</p>
                                                            )}
                                                        </div>

                                                        {/* Step 2: Sale Deed (Buyer & Seller) */}
                                                        <div className={`p-4 rounded-lg border ${(offer.registration_doc_verified || (offer.buyer_deed_payment?.status === 'VERIFIED' && offer.seller_deed_payment?.status === 'VERIFIED'))
                                                            ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>

                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-bold uppercase text-gray-500">Step 2</span>
                                                                {(offer.registration_doc_verified || (offer.buyer_deed_payment?.status === 'VERIFIED' && offer.seller_deed_payment?.status === 'VERIFIED')) ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-gray-400" />}
                                                            </div>
                                                            <h5 className="font-bold text-gray-900 mb-1">Sale Deed</h5>
                                                            <p className="text-xs text-gray-500 mb-3">Legal Documentation</p>

                                                            {/* New Workflow: Single Registration Document */}
                                                            {offer.registration_doc_url ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center text-xs bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
                                                                        <span className="font-medium text-indigo-800">New Registration Workflow</span>
                                                                    </div>

                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs text-gray-600">Registered Deed</span>
                                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${offer.registration_doc_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                {offer.registration_doc_verified ? 'VERIFIED' : 'PENDING'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <a href={getFileUrl(offer.registration_doc_url)} target="_blank" className="flex-1 py-1 text-[10px] text-center border border-gray-300 rounded hover:bg-gray-50 bg-white">View PDF</a>
                                                                            {!offer.registration_doc_verified && (
                                                                                <button
                                                                                    onClick={() => handleVerifyDocument('registration_doc', offer.offer_id, 'VERIFIED')}
                                                                                    className="flex-1 py-1 text-[10px] text-center bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                                                >
                                                                                    Verify
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Legacy: Split Buyer/Seller Documents
                                                                <div className="space-y-3">
                                                                    {/* Buyer Document */}
                                                                    <div className="border-b border-gray-100 pb-2">
                                                                        <p className="text-xs font-semibold text-gray-700 mb-1">Buyer Document:</p>
                                                                        {offer.buyer_deed_payment ? (
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${offer.buyer_deed_payment.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                        {offer.buyer_deed_payment.status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <a href={getFileUrl(offer.buyer_deed_payment.proof_file_url)} target="_blank" className="flex-1 py-1 text-[10px] text-center border border-gray-300 rounded hover:bg-gray-50 bg-white">View</a>
                                                                                    {offer.buyer_deed_payment.status !== 'VERIFIED' && (
                                                                                        <button
                                                                                            onClick={() => handleVerifyDocument('sale_deed', offer.buyer_deed_payment.id, 'VERIFIED')}
                                                                                            className="flex-1 py-1 text-[10px] text-center bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                                                        >
                                                                                            Verify
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-400 italic">Waiting for buyer...</p>
                                                                        )}
                                                                    </div>

                                                                    {/* Seller Document */}
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-gray-700 mb-1">Seller Document:</p>
                                                                        {offer.seller_deed_payment ? (
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${offer.seller_deed_payment.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                        {offer.seller_deed_payment.status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <a href={getFileUrl(offer.seller_deed_payment.proof_file_url)} target="_blank" className="flex-1 py-1 text-[10px] text-center border border-gray-300 rounded hover:bg-gray-50 bg-white">View</a>
                                                                                    {offer.seller_deed_payment.status !== 'VERIFIED' && (
                                                                                        <button
                                                                                            onClick={() => handleVerifyDocument('sale_deed', offer.seller_deed_payment.id, 'VERIFIED')}
                                                                                            className="flex-1 py-1 text-[10px] text-center bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                                                        >
                                                                                            Verify
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-gray-400 italic">Waiting for seller...</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Step 3: Success Fee */}
                                                        <div className={`p-4 rounded-lg border ${offer.commission_payment?.status === 'VERIFIED' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-bold uppercase text-gray-500">Step 3</span>
                                                                {offer.commission_payment?.status === 'VERIFIED' ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-yellow-500" />}
                                                            </div>
                                                            <h5 className="font-bold text-gray-900 mb-1">Success Fee</h5>
                                                            <p className="text-xs text-gray-500 mb-3">0.9% Total Commission</p>

                                                            {offer.commission_payment ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Total:</span>
                                                                        <span className="font-medium">{formatCurrency(offer.commission_payment.amount)}</span>
                                                                    </div>

                                                                    <div className="flex gap-2 mt-2">
                                                                        <a href={getFileUrl(offer.commission_payment.proof_file_url)} target="_blank" className="flex-1 py-1.5 text-xs text-center border border-gray-300 rounded hover:bg-gray-50 bg-white">View Receipt</a>
                                                                        {offer.commission_payment.status !== 'VERIFIED' && (
                                                                            <button
                                                                                onClick={() => handleVerifyDocument('commission_receipt', offer.commission_payment.id, 'VERIFIED')}
                                                                                className="flex-1 py-1.5 text-xs text-center bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                                            >
                                                                                Verify
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic">Waiting for payment...</p>
                                                            )}
                                                        </div>

                                                        {/* Step 4: Agent Payout */}
                                                        <div className={`p-4 rounded-lg border ${offer.agent_payout_status === 'PAID' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-bold uppercase text-gray-500">Step 4</span>
                                                                {offer.agent_payout_status === 'PAID' ? <CheckCircle size={16} className="text-indigo-600" /> : <AlertCircle size={16} className="text-gray-400" />}
                                                            </div>
                                                            <h5 className="font-bold text-gray-900 mb-1">Agent Payout</h5>
                                                            <p className="text-xs text-gray-500 mb-3">80% of Success Fee</p>

                                                            {offer.commission_record ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-gray-500">Payout:</span>
                                                                        <span className="font-bold text-indigo-600">{formatCurrency(offer.commission_record.agent_share)}</span>
                                                                    </div>

                                                                    {offer.agent_payout_status === 'PAID' ? (
                                                                        <div className="mt-2 py-1.5 px-2 bg-indigo-100 text-indigo-700 text-xs rounded text-center font-medium">
                                                                            Disbursed
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => openDisburseModal(offer.commission_record.id)}
                                                                            disabled={offer.agent_payout_status !== 'READY_TO_DISBURSE'}
                                                                            className={`w-full mt-2 py-1.5 text-xs text-center rounded font-medium transition-colors ${offer.agent_payout_status === 'READY_TO_DISBURSE'
                                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                }`}
                                                                        >
                                                                            {offer.agent_payout_status === 'READY_TO_DISBURSE' ? 'Disburse Funds' : 'Locked'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic">Calculated after fee...</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && summary && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                            <Briefcase size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Agent Commissions Paid</p>
                                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_commission_paid)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Net Profit</p>
                                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.net_profit)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRANSACTIONS TAB */}
                    {activeTab === 'transactions' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div className="relative max-w-sm w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search transactions..."
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm">
                                    <Download size={16} />
                                    Export CSV
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Method</th>
                                            <th className="px-6 py-4">Reference</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
                                            </tr>
                                        ) : (
                                            transactions.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                        <span className="block text-xs text-gray-400">{new Date(item.created_at).toLocaleTimeString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.payment_type === 'TOKEN' ? 'bg-blue-100 text-blue-800' :
                                                            item.payment_type === 'PLATFORM_COMMISSION' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {item.payment_type.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {formatCurrency(item.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 text-xs uppercase">
                                                        {item.payment_method.replace('_', ' ')}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                        {item.transaction_reference || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {item.status === 'VERIFIED' && <CheckCircle size={12} />}
                                                            {item.status === 'PENDING' && <Clock size={12} />}
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {item.proof_file_url && (
                                                            <a
                                                                href={getFileUrl(item.proof_file_url)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                                                            >
                                                                <FileText size={14} />
                                                                View
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Disbursement Confirmation Modal */}
            {showDisburseModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="mb-4">
                            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                <DollarSign size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Confirm Disbursement</h3>
                            <p className="text-gray-500 mt-1 text-sm">
                                Please enter the transaction reference number for the bank transfer to the agent.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transaction Reference ID
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder="e.g. UPI-1234567890"
                                value={transactionRef}
                                onChange={(e) => setTransactionRef(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisburseModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDisburse}
                                disabled={!transactionRef || disburseLoading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                {disburseLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Confirm Payout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
