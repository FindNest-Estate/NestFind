'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, DollarSign, Send, Loader2, ChevronRight, ChevronLeft, CheckCircle2, FileText, Shield, Calendar, Banknote, ClipboardCheck } from 'lucide-react';
import { createOffer } from '@/lib/api/offers';
import { CreateOfferRequest } from '@/lib/types/offer';

interface MakeOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    propertyId: string;
    propertyTitle: string;
    propertyPrice: number;
}

const STEP_LABELS = ['Offer Details', 'Conditions', 'Review & Submit'];

export default function MakeOfferModal({
    isOpen,
    onClose,
    onSuccess,
    propertyId,
    propertyTitle,
    propertyPrice,
}: MakeOfferModalProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Step 1 fields
    const [offerAmount, setOfferAmount] = useState<string>(propertyPrice.toString());
    const [earnestAmount, setEarnestAmount] = useState<string>('');
    const [possessionDate, setPossessionDate] = useState<string>('');

    // Step 2 fields
    const [loanRequired, setLoanRequired] = useState(false);
    const [inspectionRequired, setInspectionRequired] = useState(false);
    const [conditionsNotes, setConditionsNotes] = useState('');
    const [buyerMessage, setBuyerMessage] = useState('');

    // Nav-away protection
    useEffect(() => {
        if (!isOpen || !isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isOpen, isDirty]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setError(null);
            setIsSubmitting(false);
            setIsDirty(false);
            setOfferAmount(propertyPrice.toString());
            setEarnestAmount('');
            setPossessionDate('');
            setLoanRequired(false);
            setInspectionRequired(false);
            setConditionsNotes('');
            setBuyerMessage('');
        }
    }, [isOpen, propertyPrice]);

    const markDirty = useCallback(() => {
        if (!isDirty) setIsDirty(true);
    }, [isDirty]);

    if (!isOpen) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const offerValue = parseFloat(offerAmount) || 0;
    const earnestValue = parseFloat(earnestAmount) || 0;
    const percentOfAsking = propertyPrice > 0 ? ((offerValue / propertyPrice) * 100).toFixed(1) : '0';

    // --- Validation ---
    const validateStep1 = (): boolean => {
        if (isNaN(offerValue) || offerValue <= 0) {
            setError('Please enter a valid offer amount');
            return false;
        }
        if (earnestAmount && (isNaN(earnestValue) || earnestValue < 0)) {
            setError('Please enter a valid earnest amount');
            return false;
        }
        if (earnestValue > offerValue) {
            setError('Earnest amount cannot exceed offer amount');
            return false;
        }
        setError(null);
        return true;
    };

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return;
        setError(null);
        setStep(s => Math.min(s + 1, 3));
    };

    const handleBack = () => {
        setError(null);
        setStep(s => Math.max(s - 1, 1));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const payload: CreateOfferRequest = {
                property_id: propertyId,
                amount: offerValue,
                buyer_message: buyerMessage || undefined,
                earnest_amount: earnestValue || undefined,
                possession_date: possessionDate || undefined,
                loan_required: loanRequired,
                inspection_required: inspectionRequired,
                conditions_notes: conditionsNotes || undefined,
            };

            const result = await createOffer(payload);

            if (result.success) {
                setIsDirty(false);
                onSuccess();
                onClose();
            } else {
                setError('Failed to submit offer. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit offer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isDirty && step > 1) {
            if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
        }
        onClose();
    };

    // --- Minimum date for possession (tomorrow) ---
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900">Make an Offer</h2>
                        <p className="text-sm text-gray-500 truncate max-w-[280px]">{propertyTitle}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Progress */}
                <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center gap-1">
                        {STEP_LABELS.map((label, i) => {
                            const stepNum = i + 1;
                            const isActive = step === stepNum;
                            const isComplete = step > stepNum;
                            return (
                                <div key={label} className="flex-1 flex flex-col items-center">
                                    <div className="flex items-center w-full mb-1.5">
                                        <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' :
                                                isActive ? 'bg-emerald-400' :
                                                    'bg-gray-200'
                                            }`} />
                                    </div>
                                    <span className={`text-xs font-medium transition-colors ${isActive ? 'text-emerald-700' :
                                            isComplete ? 'text-emerald-600' :
                                                'text-gray-400'
                                        }`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-5 min-h-[320px]">
                    {/* Step 1: Offer Details */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                            {/* Asking Price */}
                            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Asking Price</p>
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(propertyPrice)}</p>
                                </div>
                            </div>

                            {/* Offer Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Your Offer Amount <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                    <input
                                        type="number"
                                        value={offerAmount}
                                        onChange={(e) => { setOfferAmount(e.target.value); markDirty(); }}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Enter amount"
                                        min="1"
                                        step="1000"
                                    />
                                </div>
                                <p className="mt-1.5 text-sm text-gray-500">
                                    {percentOfAsking}% of asking price
                                    {offerValue < propertyPrice ? (
                                        <span className="text-amber-600 ml-2">
                                            ({formatCurrency(propertyPrice - offerValue)} below)
                                        </span>
                                    ) : offerValue > propertyPrice ? (
                                        <span className="text-emerald-600 ml-2">
                                            ({formatCurrency(offerValue - propertyPrice)} above)
                                        </span>
                                    ) : (
                                        <span className="text-blue-600 ml-2">(At asking price)</span>
                                    )}
                                </p>
                            </div>

                            {/* Earnest Money */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Banknote className="w-4 h-4 text-gray-500" />
                                        Earnest / Token Amount
                                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                    </div>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                    <input
                                        type="number"
                                        value={earnestAmount}
                                        onChange={(e) => { setEarnestAmount(e.target.value); markDirty(); }}
                                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="e.g. 100,000"
                                        min="0"
                                        step="1000"
                                    />
                                </div>
                            </div>

                            {/* Possession Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        Desired Possession Date
                                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                    </div>
                                </label>
                                <input
                                    type="date"
                                    value={possessionDate}
                                    onChange={(e) => { setPossessionDate(e.target.value); markDirty(); }}
                                    min={minDate}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Conditions */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <span className="font-semibold text-blue-800">💡 Tip:</span> Adding conditions helps the seller understand your situation and can strengthen your offer.
                            </p>

                            {/* Loan Toggle */}
                            <div
                                onClick={() => { setLoanRequired(!loanRequired); markDirty(); }}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${loanRequired
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loanRequired ? 'bg-emerald-200' : 'bg-gray-100'
                                        }`}>
                                        <Banknote className={`w-5 h-5 ${loanRequired ? 'text-emerald-700' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">Home Loan Required</p>
                                        <p className="text-xs text-gray-500">Purchase is subject to loan approval</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors flex items-center ${loanRequired ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}>
                                    <div className="w-5 h-5 bg-white rounded-full shadow mx-1 transition-all" />
                                </div>
                            </div>

                            {/* Inspection Toggle */}
                            <div
                                onClick={() => { setInspectionRequired(!inspectionRequired); markDirty(); }}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${inspectionRequired
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inspectionRequired ? 'bg-emerald-200' : 'bg-gray-100'
                                        }`}>
                                        <ClipboardCheck className={`w-5 h-5 ${inspectionRequired ? 'text-emerald-700' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">Property Inspection Required</p>
                                        <p className="text-xs text-gray-500">Subject to satisfactory property inspection</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors flex items-center ${inspectionRequired ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}>
                                    <div className="w-5 h-5 bg-white rounded-full shadow mx-1 transition-all" />
                                </div>
                            </div>

                            {/* Conditions Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        Additional Notes
                                        <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                    </div>
                                </label>
                                <textarea
                                    value={conditionsNotes}
                                    onChange={(e) => { setConditionsNotes(e.target.value); markDirty(); }}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    rows={3}
                                    placeholder="Any specific conditions or notes for the seller..."
                                />
                            </div>

                            {/* Message to Agent */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Message to Agent <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    value={buyerMessage}
                                    onChange={(e) => { setBuyerMessage(e.target.value); markDirty(); }}
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    rows={2}
                                    placeholder="Anything you'd like the agent to know..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Submit */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                    Offer Summary
                                </h3>

                                <div className="space-y-3">
                                    {/* Offer Amount */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Offer Amount</span>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(offerValue)}</span>
                                    </div>
                                    <div className="text-xs text-right text-gray-500">
                                        {percentOfAsking}% of asking price ({formatCurrency(propertyPrice)})
                                    </div>

                                    <hr className="border-emerald-200" />

                                    {/* Earnest */}
                                    {earnestValue > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Earnest / Token</span>
                                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(earnestValue)}</span>
                                        </div>
                                    )}

                                    {/* Possession */}
                                    {possessionDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Possession Date</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {new Date(possessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Conditions */}
                                    {(loanRequired || inspectionRequired) && (
                                        <>
                                            <hr className="border-emerald-200" />
                                            <div>
                                                <span className="text-sm text-gray-600 block mb-1.5">Conditions</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {loanRequired && (
                                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                                            Home Loan Required
                                                        </span>
                                                    )}
                                                    {inspectionRequired && (
                                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                            Inspection Required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Notes */}
                                    {conditionsNotes && (
                                        <div>
                                            <span className="text-sm text-gray-600 block mb-1">Notes</span>
                                            <p className="text-sm text-gray-800 bg-white/60 p-2 rounded-lg">{conditionsNotes}</p>
                                        </div>
                                    )}

                                    {/* Message */}
                                    {buyerMessage && (
                                        <div>
                                            <span className="text-sm text-gray-600 block mb-1">Message to Agent</span>
                                            <p className="text-sm text-gray-800 bg-white/60 p-2 rounded-lg">{buyerMessage}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* What happens next */}
                            <div className="bg-blue-50 rounded-xl p-4 text-sm border border-blue-100">
                                <p className="font-semibold text-blue-900 mb-1.5">What happens next?</p>
                                <ul className="text-blue-700 space-y-1 text-xs">
                                    <li>• Agent will review your offer within 48 hours</li>
                                    <li>• They may accept, reject, or counter with a new price</li>
                                    <li>• You can track your offer status in "My Offers"</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-2">
                            <X className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-white disabled:opacity-50 transition-colors text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-white disabled:opacity-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                    )}

                    <div className="flex-1" />

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm shadow-sm"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all text-sm shadow-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Offer
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
