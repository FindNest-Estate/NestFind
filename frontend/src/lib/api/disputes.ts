import { get, post } from '@/lib/api';
import { Dispute, RaiseDisputeRequest } from '@/lib/types/disputes';

export async function raiseDispute(dealId: string, data: RaiseDisputeRequest) {
    return post(`/deals/${dealId}/disputes`, data);
}

export async function getDealDisputes(dealId: string) {
    return get<{ success: boolean; disputes: Dispute[] }>(`/deals/${dealId}/disputes`);
}

// Admin: Get All
export async function getAllDisputes() {
    return get<{ success: boolean; disputes: Dispute[] }>(`/disputes`);
}

// Admin: Get One
export async function getDisputeById(disputeId: string) {
    return get<{ success: boolean; dispute: Dispute & { deal_info?: { is_frozen: boolean; freeze_reason: string } } }>(`/disputes/${disputeId}`);
}

// Admin Operations
export async function resolveDispute(disputeId: string, status: 'RESOLVED' | 'REJECTED', adminNotes: string) {
    return post(`/disputes/${disputeId}/resolve`, { status, admin_notes: adminNotes });
}

export async function updateDisputeStatus(disputeId: string, status: string, adminNotes?: string) {
    return post(`/disputes/${disputeId}/status`, { status, admin_notes: adminNotes });
}

export async function toggleDealFreeze(dealId: string, freeze: boolean, reason?: string) {
    return post(`/deals/${dealId}/freeze`, { freeze, reason });
}
