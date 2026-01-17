'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Send,
    Building2,
    User,
    DollarSign,
    FileText,
    Navigation,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { format } from 'date-fns';

interface PageParams {
    id: string;
}

interface Transaction {
    id: string;
    property: {
        id: string;
        title: string;
        city: string;
        address: string;
    };
    buyer: {
        id: string;
        name: string;
        verified: boolean;
    };
    seller: {
        id: string;
        name: string;
        verified: boolean;
    };
    total_price: number;
    commission: {
        total: number;
        agent_share: number;
        platform_share: number;
    };
    registration_date?: string;
    registration_location?: string;
    status: string;
    display_status: string;
    allowed_actions: string[];
}

export default function AgentTransactionDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Slot booking form
    const [showSlotForm, setShowSlotForm] = useState(false);
    const [slotDate, setSlotDate] = useState('');
    const [slotTime, setSlotTime] = useState('');
    const [officeName, setOfficeName] = useState('');
    const [officeLocation, setOfficeLocation] = useState('');

    useEffect(() => {
        loadTransaction();
    }, [resolvedParams.id]);

    const loadTransaction = async () => {
        try {
            const response = await get<{ success: boolean; transaction: Transaction }>(`/transactions/${resolvedParams.id}`);
            if (response.success) {
                setTransaction(response.transaction);
            } else {
                setError('Transaction not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleBookSlot = async () => {
        if (!slotDate || !slotTime || !officeName) {
            alert('Please fill all required fields');
            return;
        }

        setActionLoading('book_slot');
        try {
            const registrationDateTime = new Date(`${slotDate}T${slotTime}`);
            await post(`/transactions/${resolvedParams.id}/book-slot`, {
                registration_date: registrationDateTime.toISOString(),
                registration_time: slotTime,
                office_name: officeName,
                office_location: officeLocation
            });
            setShowSlotForm(false);
            loadTransaction();
        } catch (err: any) {
            alert(err.message || 'Failed to book slot');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendBuyerOTP = async () => {
        setActionLoading('send_buyer_otp');
        try {
            await post(`/transactions/${resolvedParams.id}/send-buyer-otp`);
            alert('OTP sent to buyer!');
            loadTransaction();
        } catch (err: any) {
            alert(err.message || 'Failed to send OTP');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendSellerOTP = async () => {
        setActionLoading('send_seller_otp');
        try {
            await post(`/transactions/${resolvedParams.id}/send-seller-otp`);
            alert('OTP sent to seller!');
            loadTransaction();
        } catch (err: any) {
            alert(err.message || 'Failed to send OTP');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckIn = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }

        setActionLoading('checkin');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await post(`/transactions/${resolvedParams.id}/agent-checkin`, {
                        gps_lat: position.coords.latitude,
                        gps_lng: position.coords.longitude
                    });
                    loadTransaction();
                } catch (err: any) {
                    alert(err.message || 'Check-in failed');
                } finally {
                    setActionLoading(null);
                }
            },
            (err) => {
                alert('Location access denied');
                setActionLoading(null);
            }
        );
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600">{error || 'Transaction not found'}</p>
            </div>
        );
    }

    const isSlotBookingStep = transaction.status === 'INITIATED';
    const isVerificationStep = ['SLOT_BOOKED', 'BUYER_VERIFIED', 'SELLER_VERIFIED'].includes(transaction.status);
    const isPaymentStep = transaction.status === 'ALL_VERIFIED';
    const isDocumentsStep = ['SELLER_PAID', 'DOCUMENTS_PENDING'].includes(transaction.status);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{transaction.property.title}</h1>
                <p className="text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {transaction.property.address}
                </p>
            </div>

            {/* Status Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-emerald-600 font-medium">Current Status</p>
                        <p className="text-2xl font-bold text-emerald-700">{transaction.display_status}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Deal Value</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(transaction.total_price)}</p>
                    </div>
                </div>
            </div>

            {/* Parties */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.buyer.verified ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            <User className={`w-5 h-5 ${transaction.buyer.verified ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Buyer</p>
                            <p className="font-semibold text-slate-900">{transaction.buyer.name}</p>
                        </div>
                        {transaction.buyer.verified && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.seller.verified ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            <User className={`w-5 h-5 ${transaction.seller.verified ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Seller</p>
                            <p className="font-semibold text-slate-900">{transaction.seller.name}</p>
                        </div>
                        {transaction.seller.verified && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Based on Status */}

            {/* Step 1: Book Slot */}
            {isSlotBookingStep && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Book Registration Slot
                    </h3>

                    {!showSlotForm ? (
                        <button
                            onClick={() => setShowSlotForm(true)}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                        >
                            Schedule Registration
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                                    <input
                                        type="date"
                                        value={slotDate}
                                        onChange={(e) => setSlotDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Time *</label>
                                    <input
                                        type="time"
                                        value={slotTime}
                                        onChange={(e) => setSlotTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sub-Registrar Office *</label>
                                <input
                                    type="text"
                                    value={officeName}
                                    onChange={(e) => setOfficeName(e.target.value)}
                                    placeholder="e.g., Banjara Hills Sub-Registrar Office"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Office Address</label>
                                <input
                                    type="text"
                                    value={officeLocation}
                                    onChange={(e) => setOfficeLocation(e.target.value)}
                                    placeholder="Full address for GPS verification"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSlotForm(false)}
                                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBookSlot}
                                    disabled={actionLoading === 'book_slot'}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    {actionLoading === 'book_slot' ? 'Booking...' : 'Confirm Booking'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Registration Day - Verification */}
            {isVerificationStep && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Registration Day Verification
                    </h3>

                    {/* Registration Info */}
                    {transaction.registration_date && (
                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                            <p className="text-sm text-blue-600 font-medium">Scheduled</p>
                            <p className="text-lg font-bold text-blue-800">
                                {format(new Date(transaction.registration_date), 'EEEE, MMMM d, yyyy • h:mm a')}
                            </p>
                            {transaction.registration_location && (
                                <p className="text-sm text-blue-700 mt-1">{transaction.registration_location}</p>
                            )}
                        </div>
                    )}

                    {/* Agent Check-in */}
                    <div className="mb-4">
                        <button
                            onClick={handleCheckIn}
                            disabled={actionLoading === 'checkin'}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Navigation className="w-4 h-4" />
                            {actionLoading === 'checkin' ? 'Checking in...' : 'GPS Check-in at Office'}
                        </button>
                    </div>

                    {/* OTP Verification */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                {transaction.buyer.verified ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <Clock className="w-6 h-6 text-amber-500" />
                                )}
                                <div>
                                    <p className="font-medium text-slate-900">Buyer OTP</p>
                                    <p className="text-sm text-slate-500">{transaction.buyer.name}</p>
                                </div>
                            </div>
                            {!transaction.buyer.verified && transaction.status === 'SLOT_BOOKED' && (
                                <button
                                    onClick={handleSendBuyerOTP}
                                    disabled={actionLoading === 'send_buyer_otp'}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    {actionLoading === 'send_buyer_otp' ? 'Sending...' : 'Send OTP'}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                {transaction.seller.verified ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <Clock className="w-6 h-6 text-amber-500" />
                                )}
                                <div>
                                    <p className="font-medium text-slate-900">Seller OTP</p>
                                    <p className="text-sm text-slate-500">{transaction.seller.name}</p>
                                </div>
                            </div>
                            {!transaction.seller.verified && transaction.buyer.verified && (
                                <button
                                    onClick={handleSendSellerOTP}
                                    disabled={actionLoading === 'send_seller_otp'}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    {actionLoading === 'send_seller_otp' ? 'Sending...' : 'Send OTP'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Commission Info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Commission Breakdown
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Seller Commission (0.9%)</span>
                        <span className="font-medium">{formatCurrency(transaction.commission.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Your Share (0.7%)</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(transaction.commission.agent_share)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-slate-500">NestFind Fee</span>
                        <span className="font-medium">{formatCurrency(transaction.commission.platform_share)}</span>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                    * Agent commission disbursed after admin verification
                </p>
            </div>
        </div>
    );
}
