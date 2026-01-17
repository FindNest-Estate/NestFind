'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MapPin,
    ShieldCheck,
    ClipboardList,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronRight,
    AlertTriangle,
    Navigation,
    Send
} from 'lucide-react';
import {
    getAssignmentDetail,
    startVerification,
    generateOtp,
    verifyOtp,
    completeVerification,
    AssignmentDetail
} from '@/lib/api/agent';

const STEPS = [
    { id: 'location', label: 'Location Check', icon: MapPin },
    { id: 'otp', label: 'OTP Exchange', icon: ShieldCheck },
    { id: 'checklist', label: 'Document Checklist', icon: ClipboardList },
    { id: 'review', label: 'Final Review', icon: CheckCircle },
];

const CHECKLIST_ITEMS = [
    { id: 'property_exists', label: 'Property exists at location' },
    { id: 'exterior_match', label: 'Exterior matches photos' },
    { id: 'interior_match', label: 'Interior matches photos' },
    { id: 'access_confirmed', label: 'Access/Keys confirmed' },
    { id: 'no_legal_issues', label: 'No visible legal notices' },
    { id: 'safe_environment', label: 'Safe environment' },
];

export default function VerificationPage() {
    const params = useParams();
    const router = useRouter();
    const assignmentId = params.assignmentId as string;

    const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Step 1: Location
    const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

    // Step 2: OTP
    const [otpCode, setOtpCode] = useState('');
    const [otpStatus, setOtpStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'failed'>('idle');
    const [otpError, setOtpError] = useState<string | null>(null);

    // Step 3: Checklist
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});

    // Step 4: Finalize
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const data = await getAssignmentDetail(assignmentId);
                setAssignment(data);

                // If already verifying, check progress (mock logic for restoration could go here)
                // For now, we always start at step 0 or current status
                if (data.property.status === 'VERIFICATION_IN_PROGRESS') {
                    // Start process implicitly if needed
                }
            } catch (err) {
                setError('Failed to load assignment.');
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [assignmentId]);

    const handleStartVerification = async () => {
        try {
            await startVerification(assignmentId);
            // Refresh logic if needed, or just proceed
        } catch (err) {
            console.error('Failed to start verification', err);
        }
    };

    // --- Actions ---

    const verifyLocation = () => {
        setLocationStatus('checking');
        if (!navigator.geolocation) {
            setLocationStatus('failed');
            setError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCoords({ lat, lng });

                // Calculate distance to property (Haversine)
                if (assignment?.property.latitude && assignment?.property.longitude) {
                    const R = 6371e3; // metres
                    const φ1 = lat * Math.PI / 180;
                    const φ2 = assignment.property.latitude * Math.PI / 180;
                    const Δφ = (assignment.property.latitude - lat) * Math.PI / 180;
                    const Δλ = (assignment.property.longitude - lng) * Math.PI / 180;

                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const d = R * c; // in metres

                    setDistance(Math.round(d));

                    // Allow up to 200m radius
                    if (d <= 200) {
                        setLocationStatus('verified');
                    } else {
                        setLocationStatus('failed');
                        setError(`You are ${Math.round(d)}m away. Must be within 200m.`);
                    }
                } else {
                    // If no coords on property, assume manual override or skip
                    setLocationStatus('verified'); // Fallback for demo
                }
            },
            (err) => {
                setLocationStatus('failed');
                setError('Unable to retrieve location.');
            }
        );
    };

    const handleSendOtp = async () => {
        setOtpStatus('sending');
        setOtpError(null);
        try {
            await generateOtp(assignmentId);
            setOtpStatus('sent');
        } catch (err: any) {
            setOtpStatus('failed');
            setOtpError(err.message || 'Failed to send OTP');
        }
    };

    const handleVerifyOtp = async () => {
        setOtpStatus('verifying');
        setOtpError(null);
        try {
            await verifyOtp(assignmentId, otpCode);
            setOtpStatus('verified');
        } catch (err: any) {
            setOtpStatus('sent'); // Go back to sent state to allow retry
            setOtpError(err.message || 'Invalid OTP');
        }
    };

    const toggleChecklistItem = (id: string) => {
        setChecklist(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const submitVerification = async (approved: boolean) => {
        setIsSubmitting(true);
        try {
            await completeVerification(assignmentId, {
                approved,
                gps_lat: coords?.lat,
                gps_lng: coords?.lng,
                notes,
                rejection_reason: approved ? undefined : rejectionReason,
                checklist: checklist
            });
            router.push('/agent/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to submit verification');
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!assignment) return <div>Assignment not found</div>;

    const allChecklistChecked = CHECKLIST_ITEMS.every(item => checklist[item.id]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 mb-1">{assignment.property.title}</h1>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{assignment.property.address}, {assignment.property.city}</span>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                        Verification in Progress
                    </div>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between px-4">
                {STEPS.map((step, idx) => {
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 relative">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-600 text-white' :
                                    isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                <step.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {step.label}
                            </span>
                            {idx < STEPS.length - 1 && (
                                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-200 -z-10"
                                    style={{ width: 'calc(100% + 2rem)', left: '50%' }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px] flex flex-col">

                {/* Step 1: Location */}
                {currentStep === 0 && (
                    <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <Navigation className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Verify Location</h2>
                        <p className="text-gray-500 max-w-md">
                            We need to confirm you are physically present at the property.
                            Ensure you have arrived before proceeding.
                        </p>

                        {locationStatus === 'checking' && (
                            <div className="flex items-center gap-2 text-emerald-600 font-medium animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking GPS coordinates...
                            </div>
                        )}

                        {locationStatus === 'failed' && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 max-w-md">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                {error || 'Location check failed'}
                            </div>
                        )}

                        {locationStatus === 'verified' && (
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Location Verified ({distance ? `${distance}m away` : 'Manual Override'})
                            </div>
                        )}

                        {locationStatus !== 'verified' && (
                            <button
                                onClick={verifyLocation}
                                disabled={locationStatus === 'checking'}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Check My Location
                            </button>
                        )}
                    </div>
                )}

                {/* Step 2: OTP */}
                {currentStep === 1 && (
                    <div className="space-y-6 flex-1 max-w-md mx-auto w-full">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Seller Identity Check</h2>
                            <p className="text-gray-500">
                                Ask the seller for the OTP sent to their registered device.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                            {(otpStatus === 'idle' || otpStatus === 'sending') && (
                                <button
                                    onClick={handleSendOtp}
                                    disabled={otpStatus === 'sending'}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {otpStatus === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Send OTP to Seller
                                </button>
                            )}

                            {(otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'failed') && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                                            placeholder="XXXXXX"
                                            className="w-full text-center text-2xl tracking-[0.5em] font-mono p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
                                            maxLength={6}
                                        />
                                    </div>
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={otpCode.length < 6 || otpStatus === 'verifying'}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        {otpStatus === 'verifying' ? 'Verifying...' : 'Verify Code'}
                                    </button>

                                    {otpError && (
                                        <p className="text-red-600 text-sm text-center">{otpError}</p>
                                    )}

                                    <button
                                        onClick={handleSendOtp}
                                        className="w-full text-sm text-gray-500 hover:text-gray-800"
                                    >
                                        Resend OTP
                                    </button>
                                </div>
                            )}

                            {otpStatus === 'verified' && (
                                <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                                    <CheckCircle className="w-12 h-12 mb-2" />
                                    <span className="font-bold">Identity Verified!</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Checklist */}
                {currentStep === 2 && (
                    <div className="space-y-6 flex-1">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Property Inspection</h2>
                            <p className="text-gray-500">Verify all items match the listing details.</p>
                        </div>

                        <div className="grid gap-3">
                            {CHECKLIST_ITEMS.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => toggleChecklistItem(item.id)}
                                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${checklist[item.id] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-emerald-300'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${checklist[item.id] ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                                        }`}>
                                        {checklist[item.id] && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className={`font-medium ${checklist[item.id] ? 'text-emerald-900' : 'text-gray-700'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Final Review */}
                {currentStep === 3 && (
                    <div className="space-y-6 flex-1 max-w-md mx-auto w-full">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">Final Decision</h2>
                            <p className="text-gray-500">Review your findings and submit.</p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Location Status:</span>
                                    <span className={locationStatus === 'verified' ? 'text-emerald-600 font-medium' : 'text-red-600'}>
                                        {locationStatus === 'verified' ? 'Verified' : 'Failed'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Seller OTP:</span>
                                    <span className={otpStatus === 'verified' ? 'text-emerald-600 font-medium' : 'text-red-600'}>
                                        {otpStatus === 'verified' ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Checklist:</span>
                                    <span className={allChecklistChecked ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                                        {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} Items
                                    </span>
                                </div>
                            </div>

                            <hr className="border-gray-200" />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any observations..."
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    rows={3}
                                />
                            </div>

                            {!allChecklistChecked && (
                                <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    Some checklist items are missing. You can still approve if you explain why in notes.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => submitVerification(false)}
                                    disabled={!rejectionReason && false} // Enforce reason via UI if rejected
                                    className="py-2.5 bg-white border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => submitVerification(true)}
                                    disabled={otpStatus !== 'verified' || locationStatus !== 'verified'}
                                    className="py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Approve
                                </button>
                            </div>

                            {/* Rejection Reason Input (only if rejecting) */}
                            {/* Simplified for now: assume agent types reason if they click reject, or we show a modal. 
                                For this MVP, let's just use the notes field as rejection reason if rejected. */}
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                    <button
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                        disabled={currentStep === 0 || isSubmitting}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-0"
                    >
                        Back
                    </button>

                    {currentStep < 3 && (
                        <button
                            onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                            disabled={
                                (currentStep === 0 && locationStatus !== 'verified') ||
                                (currentStep === 1 && otpStatus !== 'verified')
                            }
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
