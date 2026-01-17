'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Square,
    Home,
    User,
    Mail,
    Phone,
    Clock,
    CheckCircle,
    XCircle,
    PlayCircle,
    Loader2,
    AlertCircle,
    Navigation
} from 'lucide-react';
import {
    getAssignmentDetail,
    acceptAssignment,
    declineAssignment,
    startVerification,
    completeVerification,
    AssignmentDetail
} from '@/lib/api/agent';

/**
 * Assignment Detail Page - /agent/assignments/[id]
 * 
 * Shows full property details and verification actions.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatPrice(price: number | null): string {
    if (!price) return 'Price TBD';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lakh`;
    return `₹${price.toLocaleString()}`;
}

interface PageParams {
    id: string;
}

export default function AssignmentDetailPage({ params }: { params: Promise<PageParams> }) {
    const resolvedParams = use(params);
    const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Verification modal
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyApproved, setVerifyApproved] = useState(true);
    const [verifyNotes, setVerifyNotes] = useState('');
    const [verifyReason, setVerifyReason] = useState('');
    const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getAssignmentDetail(resolvedParams.id);
                setAssignment(data);
            } catch (err: any) {
                console.error('Failed to load assignment:', err);
                setError(err?.message || 'Failed to load assignment');
            } finally {
                setIsLoading(false);
            }
        }

        load();
    }, [resolvedParams.id]);

    const handleAccept = async () => {
        if (!assignment) return;
        setActionLoading(true);
        try {
            await acceptAssignment(assignment.id);
            setSuccessMessage('Assignment accepted! You can now start verification.');
            const updated = await getAssignmentDetail(assignment.id);
            setAssignment(updated);
        } catch (err: any) {
            setError(err?.message || 'Failed to accept');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!assignment) return;
        const reason = prompt('Reason for declining (optional):');
        setActionLoading(true);
        try {
            await declineAssignment(assignment.id, reason || undefined);
            setSuccessMessage('Assignment declined.');
            const updated = await getAssignmentDetail(assignment.id);
            setAssignment(updated);
        } catch (err: any) {
            setError(err?.message || 'Failed to decline');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartVerification = async () => {
        if (!assignment) return;
        setActionLoading(true);
        try {
            await startVerification(assignment.id);
            setSuccessMessage('Verification started! Visit the property and complete verification.');
            const updated = await getAssignmentDetail(assignment.id);
            setAssignment(updated);
        } catch (err: any) {
            setError(err?.message || 'Failed to start verification');
        } finally {
            setActionLoading(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setGpsLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setSuccessMessage('Location captured successfully!');
            },
            (err) => {
                setError('Failed to get location: ' + err.message);
            }
        );
    };

    const handleCompleteVerification = async () => {
        if (!assignment) return;
        setActionLoading(true);
        try {
            await completeVerification(assignment.id, {
                approved: verifyApproved,
                gps_lat: gpsLocation?.lat,
                gps_lng: gpsLocation?.lng,
                notes: verifyNotes || undefined,
                rejection_reason: !verifyApproved ? verifyReason : undefined
            });
            setSuccessMessage(verifyApproved
                ? 'Property verified and now ACTIVE!'
                : 'Property returned for seller review.');
            setShowVerifyModal(false);
            const updated = await getAssignmentDetail(assignment.id);
            setAssignment(updated);
        } catch (err: any) {
            setError(err?.message || 'Failed to complete verification');
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
        );
    }

    if (error && !assignment) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href="/agent/dashboard" className="text-emerald-600 hover:underline">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    if (!assignment) return null;

    const isPending = assignment.status === 'REQUESTED';
    const isAccepted = assignment.status === 'ACCEPTED';
    const isVerifying = assignment.property.status === 'VERIFICATION_IN_PROGRESS';
    const isCompleted = assignment.status === 'COMPLETED';

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href="/agent/dashboard"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Property Images */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {assignment.property.media.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1">
                                {assignment.property.media.slice(0, 4).map((m, idx) => (
                                    <div key={m.id} className={`aspect-[4/3] ${idx === 0 ? 'col-span-2' : ''}`}>
                                        <img
                                            src={m.file_url.startsWith('/') ? `${API_BASE_URL}${m.file_url}` : m.file_url}
                                            alt={`Property image ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                <Home className="w-16 h-16 text-gray-300" />
                            </div>
                        )}
                    </div>

                    {/* Property Details */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                    {assignment.property.title || 'Untitled Property'}
                                </h1>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <MapPin className="w-4 h-4" />
                                    <span>
                                        {[assignment.property.address, assignment.property.city, assignment.property.state]
                                            .filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-emerald-600">
                                {formatPrice(assignment.property.price)}
                            </div>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-4 gap-4 py-4 border-y border-gray-100">
                            {assignment.property.bedrooms !== null && (
                                <div className="text-center">
                                    <Bed className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                    <div className="font-semibold">{assignment.property.bedrooms}</div>
                                    <div className="text-xs text-gray-500">Beds</div>
                                </div>
                            )}
                            {assignment.property.bathrooms !== null && (
                                <div className="text-center">
                                    <Bath className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                    <div className="font-semibold">{assignment.property.bathrooms}</div>
                                    <div className="text-xs text-gray-500">Baths</div>
                                </div>
                            )}
                            {assignment.property.area_sqft !== null && (
                                <div className="text-center">
                                    <Square className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                    <div className="font-semibold">{assignment.property.area_sqft}</div>
                                    <div className="text-xs text-gray-500">Sqft</div>
                                </div>
                            )}
                            <div className="text-center">
                                <Home className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                <div className="font-semibold">{assignment.property.type || 'N/A'}</div>
                                <div className="text-xs text-gray-500">Type</div>
                            </div>
                        </div>

                        {/* Description */}
                        {assignment.property.description && (
                            <div className="mt-4">
                                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-600 whitespace-pre-line">
                                    {assignment.property.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Assignment Status</h3>

                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${isPending ? 'bg-amber-100 text-amber-800' :
                            isVerifying ? 'bg-purple-100 text-purple-800' :
                                isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-blue-100 text-blue-800'
                            }`}>
                            <Clock className="w-4 h-4" />
                            {assignment.status} / {assignment.property.status}
                        </div>

                        {/* Actions based on status */}
                        <div className="space-y-2">
                            {isPending && (
                                <>
                                    <button
                                        onClick={handleAccept}
                                        disabled={actionLoading}
                                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Accept Assignment
                                    </button>
                                    <button
                                        onClick={handleDecline}
                                        disabled={actionLoading}
                                        className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Decline
                                    </button>
                                </>
                            )}

                            {isAccepted && !isVerifying && assignment.property.status !== 'ACTIVE' && (
                                <button
                                    onClick={handleStartVerification}
                                    disabled={actionLoading}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                    Start Verification
                                </button>
                            )}

                            {assignment.property.status === 'ACTIVE' && (
                                <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold mb-1">
                                        <CheckCircle className="w-5 h-5" />
                                        Verification Complete
                                    </div>
                                    <p className="text-sm text-emerald-600">Property is verified and Active.</p>
                                </div>
                            )}

                            {isVerifying && (
                                <button
                                    onClick={() => setShowVerifyModal(true)}
                                    className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Complete Verification
                                </button>
                            )}

                            {isCompleted && (
                                <div className="text-center text-emerald-600 font-medium">
                                    ✓ Verification Complete
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seller Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Seller Contact</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{assignment.seller.name}</div>
                                <div className="text-sm text-gray-500">Property Owner</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <a href={`mailto:${assignment.seller.email}`} className="flex items-center gap-2 text-gray-600 hover:text-emerald-600">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm">{assignment.seller.email}</span>
                            </a>
                            {assignment.seller.phone && (
                                <a href={`tel:${assignment.seller.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-emerald-600">
                                    <Phone className="w-4 h-4" />
                                    <span className="text-sm">{assignment.seller.phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowVerifyModal(false)} />
                    <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Verification</h3>

                        {/* GPS Capture */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">GPS Location</label>
                            <button
                                onClick={handleGetLocation}
                                className="w-full py-2 px-4 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                                <Navigation className="w-4 h-4" />
                                {gpsLocation ? `${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}` : 'Capture Current Location'}
                            </button>
                        </div>

                        {/* Approval Toggle */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setVerifyApproved(true)}
                                    className={`flex-1 py-2 rounded-lg font-medium ${verifyApproved ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => setVerifyApproved(false)}
                                    className={`flex-1 py-2 rounded-lg font-medium ${!verifyApproved ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>

                        {/* Notes/Reason */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {verifyApproved ? 'Notes (optional)' : 'Rejection Reason'}
                            </label>
                            <textarea
                                value={verifyApproved ? verifyNotes : verifyReason}
                                onChange={(e) => verifyApproved ? setVerifyNotes(e.target.value) : setVerifyReason(e.target.value)}
                                placeholder={verifyApproved ? 'Any notes about the property...' : 'Explain why the property was rejected...'}
                                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowVerifyModal(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompleteVerification}
                                disabled={actionLoading}
                                className={`flex-1 py-2.5 rounded-lg font-medium text-white ${verifyApproved ? 'bg-emerald-600' : 'bg-red-600'}`}
                            >
                                {actionLoading ? 'Processing...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
