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
    Navigation,
    IndianRupee,
    Building2,
    Calendar
} from 'lucide-react';
import {
    getAssignmentDetail,
    acceptAssignment,
    declineAssignment,
    startVerification,
    completeVerification,
    AssignmentDetail
} from '@/lib/api/agent';
import { format } from 'date-fns';

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

    if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    if (error && !assignment) return <div className="text-center py-20 text-red-500">{error}</div>;
    if (!assignment) return null;

    const isPending = assignment.status === 'REQUESTED';
    const isAccepted = assignment.status === 'ACCEPTED';
    const isVerifying = assignment.property.status === 'VERIFICATION_IN_PROGRESS';
    const isCompleted = assignment.status === 'COMPLETED';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Assignment Details
                        <span className="text-slate-400 font-normal text-lg">#{assignment.id.slice(0, 8)}</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        {[assignment.property.address, assignment.property.city].filter(Boolean).join(', ')}
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 border ${isPending ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        isVerifying ? 'bg-purple-50 border-purple-200 text-purple-700' :
                            isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                    {isVerifying ? <Navigation className="w-4 h-4" /> : isCompleted ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {assignment.status === 'ACCEPTED' && isVerifying ? 'Verifying' : assignment.status}
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 animate-fade-in-up">
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
                {/* Left Column: Property Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Images */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {assignment.property.media.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1 h-[300px]">
                                {assignment.property.media.slice(0, 3).map((m, idx) => (
                                    <div key={m.id} className={`relative overflow-hidden ${idx === 0 ? 'col-span-2 row-span-2 h-full' : 'h-full'}`}>
                                        <img
                                            src={m.file_url.startsWith('/') ? `${API_BASE_URL}${m.file_url}` : m.file_url}
                                            alt="Property"
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                <Home className="w-16 h-16 text-gray-300" />
                            </div>
                        )}
                        <div className="p-4 border-t border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{assignment.property.title || 'Untitled Property'}</h2>
                                    <p className="text-gray-500 mt-1 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> {formatPrice(assignment.property.price)}</p>
                                </div>
                                <div className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">
                                    {assignment.property.type}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features & Description */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Property Overview</h3>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <Bed className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                <div className="font-semibold">{assignment.property.bedrooms || '-'}</div>
                                <div className="text-xs text-gray-500">Beds</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <Bath className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                <div className="font-semibold">{assignment.property.bathrooms || '-'}</div>
                                <div className="text-xs text-gray-500">Baths</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <Square className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                <div className="font-semibold">{assignment.property.area_sqft || '-'}</div>
                                <div className="text-xs text-gray-500">Sqft</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg text-center">
                                <Building2 className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                <div className="font-semibold">{assignment.property.status}</div>
                                <div className="text-xs text-gray-500">Status</div>
                            </div>
                        </div>

                        {assignment.property.description && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Description</h4>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                                    {assignment.property.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions & Seller */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Actions</h3>
                        {isPending && (
                            <div className="space-y-3">
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
                            </div>
                        )}

                        {isAccepted && !isVerifying && assignment.property.status !== 'ACTIVE' && (
                            <button
                                onClick={handleStartVerification}
                                disabled={actionLoading}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                Start Verification
                            </button>
                        )}

                        {isVerifying && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-purple-900">
                                <h4 className="font-bold mb-1 flex items-center gap-2"><Navigation className="w-4 h-4" /> Verification in Progress</h4>
                                <p className="text-sm text-purple-700 mb-3">You are verifying this property.</p>
                                <button
                                    onClick={() => setShowVerifyModal(true)}
                                    className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
                                >
                                    Complete Report
                                </button>
                            </div>
                        )}

                        {isCompleted && (
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600 font-medium text-sm flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Property Verified
                            </div>
                        )}
                    </div>

                    {/* Seller Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Seller Details</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{assignment.seller.name}</div>
                                <div className="text-xs text-gray-500">Property Owner</div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-3 border-t border-gray-100">
                            <a href={`mailto:${assignment.seller.email}`} className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <Mail className="w-4 h-4" />
                                <span className="text-sm">{assignment.seller.email}</span>
                            </a>
                            {assignment.seller.phone && (
                                <a href={`tel:${assignment.seller.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 p-2 hover:bg-gray-50 rounded-lg transition-colors">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowVerifyModal(false)} />
                    <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Final Verification</h3>
                            <button onClick={() => setShowVerifyModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
                        </div>

                        {/* GPS Capture */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">GPS Coordinates</label>
                            <button
                                onClick={handleGetLocation}
                                className={`w-full py-3 px-4 border rounded-xl flex items-center justify-center gap-2 transition-colors ${gpsLocation ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                            >
                                <Navigation className="w-5 h-5" />
                                {gpsLocation ? `Lat: ${gpsLocation.lat.toFixed(4)}, Lng: ${gpsLocation.lng.toFixed(4)}` : 'Capture Location'}
                            </button>
                            {gpsLocation && <p className="text-xs text-emerald-600 mt-1 text-center">Location captured</p>}
                        </div>

                        {/* Approval Toggle */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setVerifyApproved(true)}
                                    className={`py-3 rounded-xl font-medium border-2 transition-all ${verifyApproved ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => setVerifyApproved(false)}
                                    className={`py-3 rounded-xl font-medium border-2 transition-all ${!verifyApproved ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>

                        {/* Notes/Reason */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {verifyApproved ? 'Verification Notes (Optional)' : 'Rejection Reason (Required)'}
                            </label>
                            <textarea
                                value={verifyApproved ? verifyNotes : verifyReason}
                                onChange={(e) => verifyApproved ? setVerifyNotes(e.target.value) : setVerifyReason(e.target.value)}
                                placeholder={verifyApproved ? 'Property condition, anomalies...' : 'Missing documents, property mismatch...'}
                                className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                rows={3}
                            />
                        </div>

                        <button
                            onClick={handleCompleteVerification}
                            disabled={actionLoading || (!verifyApproved && !verifyReason)}
                            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                        >
                            {actionLoading ? 'Submitting Report...' : 'Submit Verification Report'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
