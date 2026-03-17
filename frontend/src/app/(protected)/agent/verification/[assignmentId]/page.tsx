'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MapPin,
    ShieldCheck,
    ClipboardList,
    FileText,
    CheckCircle,
    XCircle,
    Loader2,
    ChevronRight,
    AlertTriangle,
    Navigation,
    Send,
    Camera
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
    { id: 'otp', label: 'Identity Check', icon: ShieldCheck },
    { id: 'inspection', label: 'Property Inspection', icon: ClipboardList },
    { id: 'documents', label: 'Document Check', icon: FileText },
    { id: 'review', label: 'Final Review', icon: CheckCircle },
];

const INSPECTION_ITEMS = [
    { id: 'property_exists', label: 'Property exists at location' },
    { id: 'exterior_match', label: 'Exterior matches listing' },
    { id: 'interior_match', label: 'Interior matches listing' },
    { id: 'no_legal_issues', label: 'No visible legal/dispute notices' },
    { id: 'safe_environment', label: 'Safe and accessible environment' },
    { id: 'photos_taken', label: 'I have taken fresh evidence photos' },
];

const DOCUMENT_ITEMS = [
    { id: 'sale_deed', label: 'Original Sale Deed Verified' },
    { id: 'encumbrance', label: 'Encumbrance Certificate (EC) Verified' },
    { id: 'tax_receipt', label: 'Recent Property Tax Receipt Verified' },
    { id: 'owner_id', label: 'Owner ID (Aadhaar/PAN) Matches Documents' },
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

    // Step 3: Inspection
    const [inspection, setInspection] = useState<Record<string, boolean>>({});

    // Step 4: Documents
    const [documents, setDocuments] = useState<Record<string, boolean>>({});
    const [docMetadata, setDocMetadata] = useState({
        sale_deed_reg_no: '',
        sale_deed_year: '',
        tax_id: ''
    });

    // Step 5: Finalize
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const data = await getAssignmentDetail(assignmentId);
                setAssignment(data);

                // Auto-start verification if not already
                if (data.property.status === 'ASSIGNED') {
                    await startVerification(assignmentId);
                }
            } catch (err) {
                setError('Failed to load assignment. Ensure you have accepted it first.');
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [assignmentId]);

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

                    // Require 200m radius
                    if (d <= 200) {
                        setLocationStatus('verified');
                    } else {
                        setLocationStatus('failed');
                        setError(`You are ${Math.round(d)}m away. Must be within 200m.`);
                    }
                } else {
                    // Fallback if property lacks precise coords
                    setLocationStatus('verified');
                }
            },
            (err) => {
                setLocationStatus('failed');
                setError('Unable to retrieve location. Please check browser permissions.');
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
            setOtpStatus('sent');
            setOtpError(err.message || 'Invalid OTP');
        }
    };

    const toggleInspectionItem = (id: string) => {
        setInspection(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleDocumentItem = (id: string) => {
        setDocuments(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const submitVerification = async (approved: boolean) => {
        setIsSubmitting(true);
        try {
            // Build the comprehensive nested JSONB payload for `property_verifications.checklist`
            const fullChecklistData = {
                inspection: inspection,
                documents: documents,
                metadata: docMetadata,
                version: "2.0" // Tracking protocol version
            };

            await completeVerification(assignmentId, {
                approved,
                gps_lat: coords?.lat,
                gps_lng: coords?.lng,
                notes,
                rejection_reason: approved ? undefined : rejectionReason,
                checklist: fullChecklistData
            });
            router.push('/agent/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to submit verification report');
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

    const allInspectionChecked = INSPECTION_ITEMS.every(item => inspection[item.id]);
    const allDocumentsChecked = DOCUMENT_ITEMS.every(item => documents[item.id]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 mb-1">Verify: {assignment.property.title}</h1>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{assignment.property.address}, {assignment.property.city}</span>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                        Field Verification
                    </div>
                </div>
            </div>

            {/* Stepper Wizard */}
            <div className="flex items-center justify-between px-2 sm:px-6">
                {STEPS.map((step, idx) => {
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-emerald-600 text-white shadow-md scale-110' :
                                        isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                <step.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] sm:text-xs font-medium text-center max-w-[60px] sm:max-w-none ${isActive ? 'text-emerald-700' : 'text-gray-500'
                                }`}>
                                {step.label}
                            </span>
                            {idx < STEPS.length - 1 && (
                                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-200 -z-10"
                                    style={{ width: 'calc(100% + 2rem)', left: '50%' }}>
                                    <div className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: isCompleted ? '100%' : '0%' }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px] flex flex-col shadow-sm">

                {/* Global Error Banner */}
                {error && currentStep !== 0 && ( /* Error handled locally in Step 0 */
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-800">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Step 1: Location Check */}
                {currentStep === 0 && (
                    <div className="space-y-6 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <Navigation className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">GPS Verification</h2>
                        <p className="text-gray-500 max-w-md">
                            NestFind strictly requires agents to verify properties in person.
                            Please verify your GPS coords are within a 200m radius of the property.
                        </p>

                        {locationStatus === 'checking' && (
                            <div className="flex items-center gap-2 text-emerald-600 font-medium animate-pulse mt-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Acquiring Satellite Fix...
                            </div>
                        )}

                        {locationStatus === 'failed' && (
                            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 max-w-md mt-4 text-left">
                                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">Location Verification Failed</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {locationStatus === 'verified' && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-3 mt-4">
                                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-600" />
                                <div className="text-left">
                                    <p className="font-bold">Property Location Verified</p>
                                    <p className="text-sm opacity-90">{distance !== null ? `Distance: ${distance}m` : 'Coordinates Recorded'}</p>
                                </div>
                            </div>
                        )}

                        {locationStatus !== 'verified' && (
                            <div className="pt-4">
                                <button
                                    onClick={verifyLocation}
                                    disabled={locationStatus === 'checking'}
                                    className="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <MapPin className="w-5 h-5" />
                                    Check My Coordinates
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Identity Check (OTP) */}
                {currentStep === 1 && (
                    <div className="space-y-6 flex-1 max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Seller Identity Check</h2>
                            <p className="text-gray-500">
                                Verify the seller is present by requesting the OTP sent to their registered device.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
                            {(otpStatus === 'idle' || otpStatus === 'sending') && (
                                <button
                                    onClick={handleSendOtp}
                                    disabled={otpStatus === 'sending'}
                                    className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {otpStatus === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    Send Verification OTP to Seller
                                </button>
                            )}

                            {(otpStatus === 'sent' || otpStatus === 'verifying' || otpStatus === 'failed') && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm text-center border border-blue-100">
                                        OTP sent to Seller's Email/Phone
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                                            placeholder="XXXXXX"
                                            className="w-full text-center text-2xl tracking-[0.5em] font-mono p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0 uppercase transition-colors"
                                            maxLength={6}
                                        />
                                    </div>
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={otpCode.length < 6 || otpStatus === 'verifying'}
                                        className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {otpStatus === 'verifying' ? 'Verifying...' : 'Confirm OTP'}
                                    </button>

                                    {otpError && (
                                        <p className="text-red-600 text-sm text-center font-medium bg-red-50 py-2 rounded">{otpError}</p>
                                    )}

                                    <button
                                        onClick={handleSendOtp}
                                        className="w-full text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
                                    >
                                        Resend OTP
                                    </button>
                                </div>
                            )}

                            {otpStatus === 'verified' && (
                                <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                                    <CheckCircle className="w-16 h-16 mb-3 text-emerald-500" />
                                    <span className="font-bold text-xl">Identity Verified!</span>
                                    <p className="text-sm mt-1 text-emerald-700">Seller presence confirmed.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Property Inspection */}
                {currentStep === 2 && (
                    <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Property Inspection</h2>
                            <p className="text-gray-500 mt-1">Physically verify the property matched the listing.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {INSPECTION_ITEMS.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => toggleInspectionItem(item.id)}
                                    className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${inspection[item.id]
                                            ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                            : 'bg-white border-gray-100 shadow-sm hover:border-emerald-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${inspection[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                                        }`}>
                                        {inspection[item.id] && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className={`font-medium leading-tight ${inspection[item.id] ? 'text-emerald-900' : 'text-gray-700'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mt-6 flex gap-3">
                            <Camera className="w-6 h-6 flex-shrink-0 text-amber-600" />
                            <div className="text-sm text-amber-900">
                                <p className="font-semibold mb-1">Evidence Capture Required</p>
                                <p>You must take fresh photos of the property using the NestFind app camera. These are saved to the verification audit log securely.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Document Verification (NEW) */}
                {currentStep === 3 && (
                    <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Document Verification</h2>
                            <p className="text-gray-500 mt-1">Mandatory check of physical ownership documents.</p>
                        </div>

                        <div className="space-y-3">
                            {DOCUMENT_ITEMS.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => toggleDocumentItem(item.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${documents[item.id]
                                            ? 'bg-blue-50 border-blue-500 shadow-sm'
                                            : 'bg-white border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${documents[item.id] ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                            }`}>
                                            {documents[item.id] && <CheckCircle className="w-4 h-4 text-white" />}
                                        </div>
                                        <span className={`font-medium ${documents[item.id] ? 'text-blue-900' : 'text-gray-800'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${documents[item.id] ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {documents[item.id] ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 mt-4 border-t border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-4 px-1">Document Metadata (Optional but Recommended)</h3>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">Sale Deed Reg. No</label>
                                    <input
                                        type="text"
                                        value={docMetadata.sale_deed_reg_no}
                                        onChange={(e) => setDocMetadata({ ...docMetadata, sale_deed_reg_no: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                                        placeholder="e.g. 1234/2023"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">Registration Year</label>
                                    <input
                                        type="text"
                                        value={docMetadata.sale_deed_year}
                                        onChange={(e) => setDocMetadata({ ...docMetadata, sale_deed_year: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                                        placeholder="YYYY"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wider">Tax/Khata ID</label>
                                    <input
                                        type="text"
                                        value={docMetadata.tax_id}
                                        onChange={(e) => setDocMetadata({ ...docMetadata, tax_id: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                                        placeholder="Enter ID"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Final Review */}
                {currentStep === 4 && (
                    <div className="space-y-6 flex-1 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">Verification Report</h2>
                            <p className="text-gray-500 mt-1">Review the compiled evidence before finalizing the status.</p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">

                            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                    <span className="text-gray-600 cursor-pointer" onClick={() => setCurrentStep(0)}>GPS Verification:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${locationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {locationStatus === 'verified' ? 'PASSED' : 'FAILED'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                    <span className="text-gray-600 cursor-pointer" onClick={() => setCurrentStep(1)}>Seller Identity:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${otpStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {otpStatus === 'verified' ? 'PASSED' : 'PENDING'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                    <span className="text-gray-600 cursor-pointer" onClick={() => setCurrentStep(2)}>Property Inspection:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${allInspectionChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {Object.values(inspection).filter(Boolean).length}/{INSPECTION_ITEMS.length} CHECKED
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                                    <span className="text-gray-600 cursor-pointer" onClick={() => setCurrentStep(3)}>Document Verification:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${allDocumentsChecked ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-700'}`}>
                                        {Object.values(documents).filter(Boolean).length}/{DOCUMENT_ITEMS.length} CHECKED
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">Detailed Agent Notes (Required if rejecting)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Summarize your findings, note any discrepancies in documents..."
                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                                    rows={4}
                                />
                            </div>

                            {(!allInspectionChecked || !allDocumentsChecked) && (
                                <div className="mt-4 p-3 bg-red-50 text-red-800 border-l-4 border-red-500 text-sm rounded flex items-start gap-2 shadow-sm">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                        <strong>Incomplete Verification:</strong> You must either reject this property or provide detailed notes explaining why you are approving it despite missing checks.
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                <button
                                    onClick={() => {
                                        if (!notes) {
                                            setError("Please provide notes explaining the reason for rejection.");
                                            return;
                                        }
                                        setRejectionReason(notes);
                                        submitVerification(false);
                                    }}
                                    disabled={isSubmitting}
                                    className="py-3.5 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg font-bold transition-all disabled:opacity-50"
                                >
                                    REJECT PROPERTY
                                </button>
                                <button
                                    onClick={() => submitVerification(true)}
                                    disabled={otpStatus !== 'verified' || locationStatus !== 'verified' || isSubmitting}
                                    className="py-3.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</span>
                                    ) : 'APPROVE & ACTIVIATE'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shared Action/Navigation Footer */}
                <div className="flex justify-between mt-auto pt-8">
                    <button
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                        disabled={currentStep === 0 || isSubmitting}
                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-0 transition-colors bg-white font-medium border border-gray-200"
                    >
                        Previous Step
                    </button>

                    {currentStep < 4 && (
                        <button
                            onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                            disabled={
                                (currentStep === 0 && locationStatus !== 'verified') ||
                                (currentStep === 1 && otpStatus !== 'verified')
                            }
                            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                        >
                            Continue
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
