'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProperty, getSellerProperties } from '@/lib/api/seller';
import { PropertyStatus } from '@/lib/types/property';
import { Loader2 } from 'lucide-react';

/**
 * Property Creation Entry Point - /sell/create
 * 
 * IMPROVED: Now checks for existing DRAFT before creating new one.
 * This prevents duplicate "Untitled Property" entries in the database.
 * 
 * DESIGN PRINCIPLE: Draft-First Architecture
 * - Reuses existing DRAFT if found
 * - Only creates new DRAFT if none exists
 * - No optimistic UI or local state
 * - All edits happen on existing DB record
 */

export default function CreatePropertyPage() {
    const router = useRouter();

    useEffect(() => {
        const createOrResumeDraft = async () => {
            try {
                console.log('[CreatePropertyPage] Checking for existing drafts...');

                // First, check if user has any existing DRAFT properties
                const { properties } = await getSellerProperties();
                const existingDraft = properties.find(p => p.status === PropertyStatus.DRAFT);

                if (existingDraft) {
                    console.log('[CreatePropertyPage] Found existing draft:', existingDraft.id);
                    // Resume editing existing draft - use replace to avoid back button loop
                    router.replace(`/sell/create/${existingDraft.id}`);
                } else {
                    console.log('[CreatePropertyPage] No existing draft found. Creating new...');
                    // No existing draft - create new one
                    const response = await createProperty({});

                    console.log('[CreatePropertyPage] New draft created:', response.id);
                    // Use replace to avoid back button loop
                    router.replace(`/sell/create/${response.id}`);
                }
            } catch (error: any) {
                console.error('[CreatePropertyPage] Failed to create/resume property:', error);

                if (error?.status === 409) {
                    const existingDraftId = error?.data?.existing_draft_id || error?.data?.detail?.existing_draft_id;
                    if (existingDraftId) {
                        console.log('[CreatePropertyPage] Draft already exists, redirecting:', existingDraftId);
                        router.replace(`/sell/create/${existingDraftId}`);
                        return;
                    }
                }

                // On error, redirect to dashboard with error message
                if (error?.status === 401) {
                    // Session expired, redirect to login
                    router.push('/login?returnUrl=/sell/create');
                } else {
                    // Other error, redirect to dashboard
                    router.push('/sell/dashboard?error=create_failed');
                }
            }
        };

        createOrResumeDraft();
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#ff385c] animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">Preparing your listing...</p>
                <p className="text-gray-500 text-sm mt-2">Checking for existing drafts</p>
            </div>
        </div>
    );
}
