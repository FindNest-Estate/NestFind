'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { getCurrentUser } from '@/lib/authApi';
import StatusOverrideModal from './StatusOverrideModal';

interface AdminPropertyControlsProps {
    propertyId: string;
    currentStatus: string;
    onStatusChange: (newStatus: string) => void;
}

export default function AdminPropertyControls({
    propertyId,
    currentStatus,
    onStatusChange
}: AdminPropertyControlsProps) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const user = await getCurrentUser();
                if (user && user.role === 'ADMIN') {
                    setIsAdmin(true);
                }
            } catch {
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkAdmin();
    }, []);

    if (isLoading || !isAdmin) return null;

    return (
        <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Admin Controls</h3>
                            <p className="text-sm text-gray-600">You have administrative access to this property.</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Override Status
                        </button>
                    </div>
                </div>
            </div>

            <StatusOverrideModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                propertyId={propertyId}
                currentStatus={currentStatus}
                onSuccess={onStatusChange}
            />
        </>
    );
}
