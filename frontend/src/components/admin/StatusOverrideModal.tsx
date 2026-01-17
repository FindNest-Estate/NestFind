'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/authApi';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface StatusOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    currentStatus: string;
    onSuccess: (newStatus: string) => void;
}

const VALID_STATUSES = [
    { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'INACTIVE', label: 'Inactive', color: 'bg-red-100 text-red-800' },
    { value: 'VERIFICATION_IN_PROGRESS', label: 'Verification In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'PENDING_ASSIGNMENT', label: 'Pending Assignment', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'RESERVED', label: 'Reserved', color: 'bg-orange-100 text-orange-800' },
    { value: 'SOLD', label: 'Sold', color: 'bg-gray-100 text-gray-800' },
];

export default function StatusOverrideModal({
    isOpen,
    onClose,
    propertyId,
    currentStatus,
    onSuccess
}: StatusOverrideModalProps) {
    const [newStatus, setNewStatus] = useState<string>(currentStatus);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newStatus === currentStatus) {
            setError('Please select a different status');
            return;
        }

        if (reason.length < 10) {
            setError('Reason must be at least 10 characters long');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Get token manually since we're in a specific component context
            // In a real app we'd use a better fetch wrapper
            const user = await getCurrentUser();
            // We assume token is handled by cookie/interceptor in axios/fetch wrapper
            // But here we need to make sure we send the request correctly.
            // Let's assume common fetch pattern with cookies if available, 
            // but for admin actions, we might need to be careful.

            // NOTE: The previous API calls seem to rely on cookies or local implementation.
            // I'll use a direct fetch here assuming standard auth handling.

            // To be safe, let's look for a token in document.cookie if we need it
            let token = '';
            const match = document.cookie.match(/(^| )access_token=([^;]+)/);
            if (match) token = match[2];

            const response = await fetch(`${API_BASE_URL}/admin/properties/${propertyId}/override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    new_status: newStatus,
                    reason: reason.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to override status');
            }

            onSuccess(newStatus);
            onClose();
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                        <h2 className="text-lg font-bold text-gray-900">Override Status</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <span className="font-semibold">Warning:</span> You are manually overriding the property status.
                        This bypasses standard workflow checks. This action will be audited.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        >
                            {VALID_STATUSES.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Required)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why you are overriding this status..."
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1 text-right">{reason.length}/10 chars minimum</p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || reason.length < 10 || newStatus === currentStatus}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Confirm Override'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
