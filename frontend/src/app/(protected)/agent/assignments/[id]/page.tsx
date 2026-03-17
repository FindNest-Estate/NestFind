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
                router.push(`/agent/verification/${assignment.id}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
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
                                    <Button className="w-full" onClick={() => router.push(`/agent/verification/${assignment.id}`)}>
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



            {/* Decline Modal */}
            <DeclineModal
                isOpen={showDeclineModal}
                onClose={() => setShowDeclineModal(false)}
                onConfirm={handleDecline}
            />
        </div>
    );
}
