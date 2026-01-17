'use client';

/**
 * Application Declined Page
 * 
 * Based on: frontend/docs/auth_state_machine.md
 * 
 * Handles:
 * - DECLINED state display
 * - Decline reason (if available)
 * - Logout only
 */

// ... imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/authApi';
import { get, put, post } from '@/lib/api'; // Use shared api client that handles cookies

// Define API helpers inline or import if available
// Assuming we can use fetch for now or adding to authApi

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

export default function DeclinedPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [declineReason, setDeclineReason] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<any>(null);
    const [loadingForm, setLoadingForm] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            // ... existing logic ...
            try {
                const user = await getCurrentUser();

                if (user.status !== 'DECLINED') {
                    if (user.status === 'ACTIVE') router.push('/dashboard');
                    else if (user.status === 'IN_REVIEW') router.push('/under-review');
                    else router.push('/login');
                    return;
                }

                // Fetch reason and application data parallelly
                try {
                    const [reasonData, appData] = await Promise.all([
                        get<{ reason: string }>('/auth/agent/rejection-reason').catch(() => null),
                        get('/auth/agent/application').catch(e => {
                            console.error("Failed to fetch app data", e);
                            return null;
                        })
                    ]);

                    if (reasonData?.reason) setDeclineReason(reasonData.reason);
                    if (appData) setFormData(appData);

                } catch (e) {
                    console.error("Failed to fetch data", e);
                }

            } catch (error) {
                console.error('Status check failed:', error);
                router.push('/login');
            }
        };

        checkStatus();
    }, [router]);

    const loadApplicationData = async () => {
        setLoadingForm(true);
        try {
            const data = await get('/auth/agent/application');
            setFormData(data);
            setShowEditModal(true);
        } catch (e) {
            console.error(e);
            alert("Error loading data.");
        } finally {
            setLoadingForm(false);
        }
    };

    const handleSaveAndResubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirm("Are you sure you want to update your details and resubmit for review?")) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');

            // 1. Update Details
            const updateRes = await fetch('http://localhost:8000/auth/agent/application', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!updateRes.ok) {
                const err = await updateRes.json();
                alert("Failed to update application: " + err.detail);
                setSaving(false);
                return;
            }

            // 2. Resubmit
            const resubmitRes = await fetch('http://localhost:8000/auth/agent/resubmit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (resubmitRes.ok) {
                router.push('/under-review');
            } else {
                const err = await resubmitRes.json();
                alert("Details updated, but failed to resubmit: " + err.detail);
            }

        } catch (e) {
            console.error(e);
            alert("Error connecting to server.");
        } finally {
            setSaving(false);
        }
    };

    const handleInput = (e: any) => {
        const { name, value } = e.target;
        // Handle number inputs
        const val = (name === 'service_radius_km' || name === 'latitude' || name === 'longitude') ? Number(value) : value;
        setFormData({ ...formData, [name]: val });
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            router.push('/login');
        }
    };

    // Removed handleResubmit as it's no longer used independently

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Application Details">
                {formData && (
                    <form onSubmit={handleSaveAndResubmit} className="space-y-4">
                        {/* ... fields ... */}

                        {/* We need to re-render the form content or rely on existing layout. 
                            The Replace tool replaces specific BLOCK.
                            I will just update the form tag and the button at the end.
                            Wait, the replace block must match EXACTLY.
                            I should select the start of form and end of form separately or large chunk.
                            Let's replace the whole form logic if possible, or just the button?
                            The handler name changed to handleSaveAndResubmit.
                        */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input name="full_name" value={formData.full_name} onChange={handleInput} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number (+91...)</label>
                            <input name="mobile_number" value={formData.mobile_number} onChange={handleInput} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                                <input name="pan_number" value={formData.pan_number} onChange={handleInput} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                                <input name="aadhaar_number" value={formData.aadhaar_number} onChange={handleInput} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                        </div>
                        {/* Address removed from edit form as per requirement */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Service Radius (KM)</label>
                                <input type="number" name="service_radius_km" value={formData.service_radius_km} onChange={handleInput} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Current Status</label>
                                <div className="mt-1 text-sm text-gray-500 py-2">DECLINED (Edit Mode)</div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 border rounded-md">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400">
                                {saving ? 'Submitting...' : 'Submit Agent Application'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Declined</h1>
                    <p className="text-gray-600 mb-6">
                        Unfortunately, we are unable to approve your agent application at this time.
                    </p>

                    {declineReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                            <h2 className="text-sm font-semibold text-red-900 mb-2">Reason provided:</h2>
                            <p className="text-sm text-red-800">{declineReason}</p>
                        </div>
                    )}

                    {formData && (
                        <div className="mb-6 text-left text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Current Application Details</h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">Name:</span>
                                    <span className="col-span-2 text-gray-900 font-medium">{formData.full_name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">Mobile:</span>
                                    <span className="col-span-2 text-gray-900">{formData.mobile_number}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">Address:</span>
                                    <span className="col-span-2 text-gray-900 truncate">{formData.address || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">Service Radius:</span>
                                    <span className="col-span-2 text-gray-900">{formData.service_radius_km} km</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">PAN:</span>
                                    <span className="col-span-2 text-gray-900">{formData.pan_number}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-gray-500">Aadhaar:</span>
                                    <span className="col-span-2 text-gray-900">{formData.aadhaar_number}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            Edit & Resubmit
                        </button>

                        <a
                            href="mailto:support@nestfind.com"
                            className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none"
                        >
                            Contact Support
                        </a>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:bg-gray-100"
                        >
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
