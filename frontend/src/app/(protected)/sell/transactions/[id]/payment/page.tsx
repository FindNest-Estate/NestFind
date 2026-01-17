'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    Building2,
    AlertCircle,
    CheckCircle2,
    CreditCard,
    Loader2,
    ArrowLeft,
    Shield
} from 'lucide-react';
import { get, post } from '@/lib/api';

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
    total_price: number;
    commission: {
        total: number;
        agent_share: number;
        platform_share: number;
    };
    status: string;
}

export default function SellerPaymentPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

    useEffect(() => {
        loadTransaction();
    }, [resolvedParams.id]);

    const loadTransaction = async () => {
        try {
            const response = await get<{ success: boolean; transaction: Transaction }>(`/transactions/${resolvedParams.id}`);
            if (response.success) {
                setTransaction(response.transaction);
                if (response.transaction.status !== 'ALL_VERIFIED') {
                    setError('Payment is not available at this stage');
                }
            } else {
                setError('Transaction not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load transaction');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!transaction) return;

        setSubmitting(true);
        try {
            // Mock payment reference
            const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            const response = await post(`/transactions/${transaction.id}/seller-payment`, {
                payment_reference: paymentReference,
                payment_method: paymentMethod
            });

            if (response.success) {
                alert('Payment successful! Please upload the required documents.');
                router.push(`/sell/transactions/${transaction.id}/documents`);
            } else {
                throw new Error(response.error || 'Payment failed');
            }
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setSubmitting(false);
        }
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
            <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-600">{error || 'Transaction not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-4 py-2 text-slate-600 hover:underline"
                >
                    ← Go Back
                </button>
            </div>
        );
    }

    const commissionAmount = transaction.commission.total;
    const commissionPercent = (commissionAmount / transaction.total_price * 100).toFixed(1);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Transaction
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Commission Payment</h1>
                        <p className="text-slate-500">Complete the {commissionPercent}% platform commission</p>
                    </div>
                </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">{transaction.property.title}</h3>
                        <p className="text-sm text-slate-500">{transaction.property.address}</p>
                        <p className="text-lg font-bold text-emerald-600 mt-2">
                            {formatCurrency(transaction.total_price)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Payment Breakdown</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Property Sale Price</span>
                        <span className="text-slate-900">{formatCurrency(transaction.total_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Commission Rate</span>
                        <span className="text-slate-900">0.9%</span>
                    </div>
                    <hr className="my-3" />
                    <div className="flex justify-between">
                        <span className="font-medium text-slate-900">Amount Due</span>
                        <span className="text-xl font-bold text-amber-600">
                            {formatCurrency(commissionAmount)}
                        </span>
                    </div>
                </div>

                {/* Commission Distribution Info */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                    <p>Commission distribution:</p>
                    <ul className="mt-1 space-y-1">
                        <li>• Agent share (0.7%): {formatCurrency(transaction.commission.agent_share)}</li>
                        <li>• Platform fee (0.2%): {formatCurrency(commissionAmount - transaction.commission.agent_share)}</li>
                    </ul>
                </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Payment Method</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                        <input
                            type="radio"
                            name="method"
                            value="BANK_TRANSFER"
                            checked={paymentMethod === 'BANK_TRANSFER'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-4 h-4 text-emerald-600"
                        />
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">Bank Transfer</p>
                            <p className="text-sm text-slate-500">Direct bank to bank transfer</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                        <input
                            type="radio"
                            name="method"
                            value="UPI"
                            checked={paymentMethod === 'UPI'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-4 h-4 text-emerald-600"
                        />
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">UPI</p>
                            <p className="text-sm text-slate-500">Pay via UPI ID</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-700">
                    <p className="font-medium">Secure Payment</p>
                    <p className="text-emerald-600 mt-1">
                        Your payment is protected. Commission will be distributed only after admin verification of all documents.
                    </p>
                </div>
            </div>

            {/* Pay Button */}
            <button
                onClick={handlePayment}
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        Pay {formatCurrency(commissionAmount)}
                    </>
                )}
            </button>
        </div>
    );
}
