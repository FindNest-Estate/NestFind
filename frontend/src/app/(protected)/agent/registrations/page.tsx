"use client";

import { useState, useEffect } from "react";
import { getTransactions } from "@/lib/api/transactions";
import { Transaction, TransactionStatus } from "@/lib/types/transaction";
import { Loader2, Calendar, MapPin, Users, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { format, isPast, isToday, isTomorrow } from "date-fns";

const STATUS_CONFIG = {
    INITIATED: { label: "Pending Verification", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    BUYER_VERIFIED: { label: "Buyer Verified", color: "bg-blue-100 text-blue-800", icon: Users },
    SELLER_VERIFIED: { label: "All Verified", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: AlertCircle },
    FAILED: { label: "Failed", color: "bg-red-100 text-red-800", icon: AlertCircle },
};

function getDateLabel(dateString: string): { label: string; urgent: boolean } {
    const date = new Date(dateString);
    if (isToday(date)) return { label: "Today", urgent: true };
    if (isTomorrow(date)) return { label: "Tomorrow", urgent: false };
    if (isPast(date)) return { label: "Overdue", urgent: true };
    return { label: format(date, "MMM d, yyyy"), urgent: false };
}

export default function AgentRegistrationsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTransactions();
    }, [activeTab]);

    async function loadTransactions() {
        setIsLoading(true);
        setError(null);
        try {
            // For 'active' tab, get INITIATED, BUYER_VERIFIED, SELLER_VERIFIED
            // For 'completed' tab, get COMPLETED, CANCELLED, FAILED
            const data = await getTransactions();

            const filtered = data.transactions.filter(t => {
                const isActive = [TransactionStatus.INITIATED, TransactionStatus.BUYER_VERIFIED, TransactionStatus.SELLER_VERIFIED].includes(t.status);
                return activeTab === 'active' ? isActive : !isActive;
            });

            setTransactions(filtered);
        } catch (err: any) {
            setError(err.message || "Failed to load registrations");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Scheduled Registrations</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-200 p-1 rounded-xl mb-6 w-fit">
                    {(['active', 'completed'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'active' ? 'Active' : 'Completed'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">
                            {activeTab === 'active'
                                ? "No scheduled registrations"
                                : "No completed registrations"}
                        </p>
                        <p className="text-sm text-gray-400">
                            Registrations are created from accepted reservations
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map(transaction => {
                            const statusConfig = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.INITIATED;
                            const StatusIcon = statusConfig.icon;
                            const dateInfo = transaction.registration_date
                                ? getDateLabel(transaction.registration_date)
                                : null;

                            return (
                                <Link
                                    key={transaction.id}
                                    href={`/agent/registrations/${transaction.id}`}
                                    className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Property Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </span>
                                                {dateInfo && (
                                                    <span className={`text-sm ${dateInfo.urgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                                        {dateInfo.label}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                                {transaction.property_title || transaction.property?.title}
                                            </h3>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                {transaction.registration_location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {transaction.registration_location}
                                                    </span>
                                                )}
                                                {transaction.registration_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(transaction.registration_date), "PPp")}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Parties involved */}
                                            <div className="flex gap-4 mt-3 text-sm">
                                                <span className="text-gray-600">
                                                    <span className="text-gray-400">Buyer:</span> {transaction.buyer_name || transaction.buyer?.name}
                                                </span>
                                                <span className="text-gray-600">
                                                    <span className="text-gray-400">Seller:</span> {transaction.seller_name || transaction.seller?.name}
                                                </span>
                                            </div>

                                            {/* Commission info */}
                                            {transaction.commission && (
                                                <p className="mt-2 text-emerald-600 font-medium text-sm">
                                                    Commission: ₹{transaction.commission.toLocaleString('en-IN')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action arrow */}
                                        <div className="flex-shrink-0">
                                            <ArrowRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Progress indicator for active transactions */}
                                    {activeTab === 'active' && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${transaction.status === TransactionStatus.INITIATED
                                                        ? 'bg-yellow-400'
                                                        : 'bg-emerald-500'
                                                    }`} />
                                                <span className="text-xs text-gray-500">Buyer OTP</span>
                                                <div className="flex-1 h-1 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{
                                                            width: transaction.status === TransactionStatus.INITIATED ? '0%' : '100%'
                                                        }}
                                                    />
                                                </div>
                                                <div className={`w-3 h-3 rounded-full ${[TransactionStatus.BUYER_VERIFIED].includes(transaction.status)
                                                        ? 'bg-yellow-400'
                                                        : transaction.status === TransactionStatus.SELLER_VERIFIED
                                                            ? 'bg-emerald-500'
                                                            : 'bg-gray-300'
                                                    }`} />
                                                <span className="text-xs text-gray-500">Seller OTP</span>
                                                <div className="flex-1 h-1 bg-gray-200 rounded-full">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{
                                                            width: transaction.status === TransactionStatus.SELLER_VERIFIED ? '100%' : '0%'
                                                        }}
                                                    />
                                                </div>
                                                <div className={`w-3 h-3 rounded-full ${transaction.status === TransactionStatus.SELLER_VERIFIED
                                                        ? 'bg-yellow-400'
                                                        : 'bg-gray-300'
                                                    }`} />
                                                <span className="text-xs text-gray-500">Complete</span>
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
