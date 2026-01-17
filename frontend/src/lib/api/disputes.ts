import { get, post } from '@/lib/api';
import {
    Dispute,
    CreateDisputeRequest,
    DisputeListResponse,
    DisputeDecision
} from '@/lib/types/dispute';

/**
 * Raise a new dispute
 */
export async function raiseDispute(
    data: CreateDisputeRequest
): Promise<{ success: boolean; dispute_id: string }> {
    return post<{ success: boolean; dispute_id: string }>('/disputes', data);
}

/**
 * Get disputes list
 */
export async function getDisputes(
    status?: string,
    page = 1,
    perPage = 20
): Promise<DisputeListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    return get<DisputeListResponse>(`/disputes?${params.toString()}`);
}

/**
 * Get dispute details by ID
 */
export async function getDisputeById(
    disputeId: string
): Promise<{ success: boolean; dispute: Dispute }> {
    return get<{ success: boolean; dispute: Dispute }>(`/disputes/${disputeId}`);
}

/**
 * Close a dispute (Reporter)
 */
export async function closeDispute(
    disputeId: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/disputes/${disputeId}/close`);
}

/**
 * Assign dispute to self (Admin)
 */
export async function assignDispute(
    disputeId: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/disputes/${disputeId}/assign`);
}

/**
 * Resolve dispute (Admin)
 */
export async function resolveDispute(
    disputeId: string,
    decision: DisputeDecision,
    resolutionNotes: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/disputes/${disputeId}/resolve`, {
        decision,
        resolution_notes: resolutionNotes
    });
}
