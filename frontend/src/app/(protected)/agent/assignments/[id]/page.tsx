'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MapPin,
    Calendar,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    User,
    ArrowLeft,
    Phone,
    Mail,
    Shield,
    FileText,
    Navigation,
    MessageSquare,
    ChevronRight,
    Loader2
} from 'lucide-react';
import {
    getAssignmentDetail,
    acceptAssignment,
    declineAssignment,
    startVerification,
    completeVerification,
    generateOtp,
    verifyOtp,
    AssignmentDetail,
} from '@/lib/api/agent';
import { getImageUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { OTPInput } from '@/components/OTPInput';

// Verification Modal with OTP Flow
function VerificationModal({
    isOpen,
    onClose,
    onComplete,
    assignmentId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: any) => Promise<void>;
    assignmentId: string;
}) {
    const [step, setStep] = useState<'otp_request' | 'otp_verify' | 'gps_check'>('otp_request');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // GPS State
    const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Decision State
    const [verifyApproved, setVerifyApproved] = useState(true);
    const [verifyReason, setVerifyReason] = useState('');
    const [verifyNotes, setVerifyNotes] = useState('');

    const handleSendOtp = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await generateOtp(assignmentId);
            if (res.success) {
                setStep('otp_verify');
            } else {
                setError('Failed to send OTP');
            }
        } catch (err) {
            setError('Error generating OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (code?: string) => {
        const codeToVerify = code || otp;
        if (!codeToVerify || codeToVerify.length !== 6) return;

        setIsLoading(true);
        setError('');
        try {
            const res = await verifyOtp(assignmentId, codeToVerify);
            if (res.success) {
                setStep('gps_check');
            } else {
                setError('Invalid OTP. Please try again.');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const getGPS = () => {
        setIsGettingLocation(true);
        setError('');
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setGpsLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsGettingLocation(false);
            },
            () => {
                setError('Unable to retrieve your location');
                setIsGettingLocation(false);
            }
        );
    };

    const handleSubmit = async () => {
        if (!gpsLocation) {
            setError('GPS location is required');
            return;
        }

        setIsLoading(true);
        try {
            await onComplete({
                approved: verifyApproved,
                gps_lat: gpsLocation.lat,
                gps_lng: gpsLocation.lng,
                notes: verifyNotes || undefined,
                rejection_reason: !verifyApproved ? verifyReason : undefined
            });
        } catch (err) {
            setError('Failed to complete verification');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Property Verification"
            description="Follow the steps to verify this property."
        >
            <div className="space-y-6">
                {/* Steps Indicator */}
                <div className="flex items-center justify-between text-sm border-b border-[var(--gray-200)] pb-4">
                    <div className={`flex items-center gap-2 ${step === 'otp_request' ? 'text-[var(--color-brand)] font-bold' : 'text-[var(--gray-400)]'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'otp_request' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--gray-200)]'}`}>1</div>
                        <span>Request OTP</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--gray-300)]" />
                    <div className={`flex items-center gap-2 ${step === 'otp_verify' ? 'text-[var(--color-brand)] font-bold' : step === 'gps_check' ? 'text-[var(--color-brand)]' : 'text-[var(--gray-400)]'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'otp_verify' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : step === 'gps_check' ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-[var(--gray-200)]'}`}>2</div>
                        <span>Verify OTP</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--gray-300)]" />
                    <div className={`flex items-center gap-2 ${step === 'gps_check' ? 'text-[var(--color-brand)] font-bold' : 'text-[var(--gray-400)]'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 'gps_check' ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--gray-200)]'}`}>3</div>
                        <span>Inspect</span>
                    </div>
                </div>

                {error && (
                    <Alert variant="error" title="Error" description={error} />
                )}

                {/* Step 1: Request OTP */}
                {step === 'otp_request' && (
                    <div className="space-y-4 py-4 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <MessageSquare className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-[var(--gray-900)]">Ask Seller for OTP</h3>
                        <p className="text-[var(--gray-500)] text-sm">
                            Click below to send a 6-digit verification code to the seller's registered mobile number/email.
                        </p>
                        <Button onClick={handleSendOtp} disabled={isLoading} className="w-full">
                            {isLoading ? 'Sending...' : 'Send OTP to Seller'}
                        </Button>
                    </div>
                )}

                {/* Step 2: Verify OTP */}
                {step === 'otp_verify' && (
                    <div className="space-y-4 py-4 text-center">
                        <h3 className="font-bold text-[var(--gray-900)]">Enter Verification Code</h3>
                        <p className="text-[var(--gray-500)] text-sm mb-4">Enter the 6-digit code received by the seller.</p>

                        <div className="flex justify-center">
                            <OTPInput
                                length={6}
                                onComplete={(code) => {
                                    setOtp(code);
                                    handleVerifyOtp(code);
                                }}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setStep('otp_request')} className="flex-1">Back</Button>
                            <Button onClick={() => handleVerifyOtp()} disabled={isLoading || otp.length !== 6} className="flex-1">
                                {isLoading ? 'Verifying...' : 'Verify Code'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: GPS + Inspection */}
                {step === 'gps_check' && (
                    <div className="space-y-4">

                        {/* GPS Section */}
                        <div className="bg-[var(--gray-50)] p-4 rounded-lg border border-[var(--gray-200)]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">Location Check</span>
                                {gpsLocation && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </div>

                            {!gpsLocation ? (
                                <button
                                    onClick={getGPS}
                                    disabled={isGettingLocation}
                                    className="flex items-center gap-2 text-sm text-[var(--color-brand)] font-medium hover:underline"
                                >
                                    <MapPin className="w-4 h-4" />
                                    {isGettingLocation ? 'Getting location...' : 'Capture GPS Location'}
                                </button>
                            ) : (
                                <div className="text-xs text-[var(--gray-600)] font-mono">
                                    {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                                </div>
                            )}
                        </div>

                        {/* Approval Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium">Verification Result</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setVerifyApproved(true)}
                                    className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${verifyApproved
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                        : 'border-[var(--gray-200)] text-[var(--gray-500)] hover:bg-[var(--gray-50)]'
                                        }`}
                                >
                                    <CheckCircle className="w-4 h-4" /> Approved
                                </button>
                                <button
                                    onClick={() => setVerifyApproved(false)}
                                    className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${!verifyApproved
                                        ? 'border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)] ring-1 ring-[var(--color-error)]'
                                        : 'border-[var(--gray-200)] text-[var(--gray-500)] hover:bg-[var(--gray-50)]'
                                        }`}
                                >
                                    <XCircle className="w-4 h-4" /> Rejected
                                </button>
                            </div>
                        </div>

                        {!verifyApproved && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--gray-500)] mb-1">Rejection Reason</label>
                                <select
                                    value={verifyReason}
                                    onChange={(e) => setVerifyReason(e.target.value)}
                                    className="w-full px-3 py-2 rounded-md border border-[var(--gray-300)] text-sm"
                                >
                                    <option value="">Select reason...</option>
                                    <option value="property_mismatch">Property details do not match</option>
                                    <option value="seller_unavailable">Seller unavailable</option>
                                    <option value="access_issue">Cannot access property</option>
                                    <option value="condition_issue">Poor condition</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--gray-500)] mb-1">Notes</label>
                            <textarea
                                value={verifyNotes}
                                onChange={(e) => setVerifyNotes(e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-[var(--gray-300)] text-sm focus:ring-1 focus:ring-[var(--color-brand)] outline-none"
                                rows={3}
                                placeholder="Any additional observations..."
                            />
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !gpsLocation || (!verifyApproved && !verifyReason)}
                            className="w-full"
                        >
                            {isLoading ? 'Processing...' : verifyApproved ? 'Complete & Approve' : 'Reject Verification'}
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Decline Modal
function DeclineModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Decline Assignment"
            description="Are you sure you want to decline this assignment? This action cannot be undone."
        >
            <div className="space-y-4">
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason..."
                    className="w-full p-3 border border-[var(--gray-200)] rounded-md text-sm outline-none focus:border-[var(--color-brand)] min-h-[100px]"
                />
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="danger" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
                        Decline Assignment
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default function AssignmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadAssignment(params.id as string);
        }
    }, [params.id]);

    const loadAssignment = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getAssignmentDetail(id);
            setAssignment(data);
        } catch (err) {
            setError('Failed to load assignment details');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!assignment) return;
        setIsActionLoading(true);
        try {
            const res = await acceptAssignment(assignment.id);
            if (res.success) {
                loadAssignment(assignment.id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDecline = async (reason: string) => {
        if (!assignment) return;
        setIsActionLoading(true);
        try {
            const res = await declineAssignment(assignment.id, reason);
            if (res.success) {
                router.push('/agent/assignments');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
            setShowDeclineModal(false);
        }
    };

    const handleStartVerification = async () => {
        if (!assignment) return;
        setIsActionLoading(true);
        try {
            const res = await startVerification(assignment.id);
            if (res.success) {
                loadAssignment(assignment.id);
                // Automatically open modal if needed, or wait for user to click "Complete"
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCompleteVerification = async (data: any) => {
        if (!assignment) return;
        try {
            const res = await completeVerification(
                assignment.id,
                data
            );

            if (res.success) {
                setShowVerifyModal(false);
                loadAssignment(assignment.id);
            }
        } catch (err) {
            // Error handled in modal
            throw err;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
            </div>
        );
    }

    if (error || !assignment) {
        return <Alert variant="error" title="Error" description={error || "Assignment not found"} />;
    }

    const { property, seller } = assignment;

    // Derived state or fallbacks for missing API fields
    const propertyImage = property.media && property.media.length > 0 ? getImageUrl(property.media[0].file_url) : null;
    const formattedPrice = property.price ? `$${property.price.toLocaleString()}` : 'Price TBD';

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--gray-900)]">Assignment #{assignment.id.substring(0, 8)}</h1>
                    <div className="flex items-center gap-2 text-[var(--gray-500)] text-sm">
                        <span>Requested {new Date(assignment.requested_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <Badge variant={
                            assignment.status === 'ACCEPTED' ? 'success' :
                                assignment.status === 'COMPLETED' ? 'neutral' :
                                    assignment.status === 'DECLINED' ? 'error' : 'warning'
                        }>
                            {assignment.status}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Property Card */}
                    <Card>
                        <div className="relative h-48 bg-[var(--gray-200)] w-full">
                            {propertyImage ? (
                                <img src={propertyImage} alt={property.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--gray-400)]">
                                    <span className="flex items-center gap-2"><FileText className="w-5 h-5" /> No Image</span>
                                </div>
                            )}
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-white/90 backdrop-blur text-[var(--gray-900)] shadow-sm">
                                    {property.type}
                                </Badge>
                            </div>
                        </div>
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-[var(--gray-900)] mb-2">{property.title}</h2>
                            <div className="flex items-center gap-2 text-[var(--gray-500)] mb-4">
                                <MapPin className="w-4 h-4" />
                                {property.address}, {property.city}
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-[var(--gray-100)]">
                                <div>
                                    <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide">Price</p>
                                    <p className="font-semibold text-lg text-[var(--gray-900)]">
                                        {formattedPrice}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide">Size</p>
                                    <p className="font-semibold text-lg text-[var(--gray-900)]">
                                        {property.area_sqft ? `${property.area_sqft} sqft` : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide">Configuration</p>
                                    <p className="font-semibold text-lg text-[var(--gray-900)]">
                                        {property.bedrooms} Bed / {property.bathrooms} Bath
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--gray-100)]">
                                <h3 className="font-semibold text-[var(--gray-900)] mb-2">Description</h3>
                                <p className="text-[var(--gray-600)] text-sm leading-relaxed">
                                    {property.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    {/* Action Card */}
                    <Card className="p-5">
                        <h3 className="font-semibold text-[var(--gray-900)] mb-4">Actions</h3>

                        {assignment.status === 'REQUESTED' && (
                            <div className="space-y-3">
                                <Button className="w-full" onClick={handleAccept} disabled={isActionLoading}>
                                    {isActionLoading ? 'Processing...' : 'Accept Assignment'}
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => setShowDeclineModal(true)} disabled={isActionLoading}>
                                    Decline
                                </Button>
                            </div>
                        )}

                        {assignment.status === 'ACCEPTED' && (
                            <div className="space-y-3">
                                {property.status === 'PENDING_ASSIGNMENT' || property.status === 'ASSIGNED' ? (
                                    <Button className="w-full" onClick={handleStartVerification} disabled={isActionLoading}>
                                        <Shield className="w-4 h-4 mr-2" />
                                        Start Verification
                                    </Button>
                                ) : property.status === 'VERIFICATION_IN_PROGRESS' ? (
                                    <Button className="w-full" onClick={() => setShowVerifyModal(true)}>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Complete Verification
                                    </Button>
                                ) : (
                                    <div className="text-center p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm font-medium">
                                        <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                                        Property Verified
                                    </div>
                                )}
                            </div>
                        )}

                        {assignment.status === 'COMPLETED' && (
                            <div className="text-center p-3 bg-[var(--gray-50)] text-[var(--gray-600)] rounded-md text-sm">
                                This assignment is completed.
                            </div>
                        )}
                    </Card>

                    {/* Seller Info */}
                    <Card className="p-5">
                        <h3 className="font-semibold text-[var(--gray-900)] mb-4">Seller Information</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-brand-subtle)] flex items-center justify-center text-[var(--color-brand)] font-bold">
                                {seller.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-medium text-[var(--gray-900)]">{seller.name}</p>
                                <p className="text-xs text-[var(--gray-500)]">Property Owner</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-[var(--gray-600)]">
                                <Mail className="w-4 h-4 text-[var(--gray-400)]" />
                                <a href={`mailto:${seller.email}`} className="hover:text-[var(--color-brand)]">{seller.email}</a>
                            </div>
                            {seller.phone && (
                                <div className="flex items-center gap-2 text-sm text-[var(--gray-600)]">
                                    <Phone className="w-4 h-4 text-[var(--gray-400)]" />
                                    <a href={`tel:${seller.phone}`} className="hover:text-[var(--color-brand)]">{seller.phone}</a>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--gray-100)]">
                            <Button variant="outline" className="w-full" onClick={() => router.push('/agent/messages')}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Send Message
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Verification Modal */}
            <VerificationModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onComplete={handleCompleteVerification}
                assignmentId={assignment.id}
            />

            {/* Decline Modal */}
            <DeclineModal
                isOpen={showDeclineModal}
                onClose={() => setShowDeclineModal(false)}
                onConfirm={handleDecline}
            />
        </div>
    );
}
