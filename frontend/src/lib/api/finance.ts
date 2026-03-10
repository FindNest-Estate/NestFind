import * as api from '@/lib/api';
import { LedgerResponse, VerificationStatus, CommissionStatusResponse } from '../types/finance';

export async function getDealLedger(dealId: string): Promise<LedgerResponse> {
    try {
        const response = await api.get(`/deals/${dealId}/ledger`);
        // api.get returns parsed JSON directly (no .data wrapper)
        return response as LedgerResponse;
    } catch (error: any) {
        // Ledger may not exist yet for early-stage deals — graceful degradation
        if (error?.status === 404) {
            return { success: false, ledger: null } as any;
        }
        throw error;
    }
}

export async function verifyBookingDeclaration(
    dealId: string,
    entryId: string,
    status: VerificationStatus,
    notes?: string
): Promise<{ success: boolean; status: string }> {
    const response = await api.post(`/deals/${dealId}/ledger/verify-booking`, {
        entry_id: entryId,
        status,
        notes,
    });
    return response.data;
}

export async function adminOverrideLedger(
    dealId: string,
    amount: number,
    direction: 'CREDIT' | 'DEBIT' | 'INFO',
    description: string,
    metadata?: Record<string, unknown>
): Promise<{ success: boolean; entry_id: string }> {
    const response = await api.post(`/deals/${dealId}/ledger/override`, {
        amount,
        direction,
        description,
        metadata,
    });
    return response.data;
}

// ============================================================================
// PHASE 5A: Commission Lifecycle & Enhanced Payment Recording
// ============================================================================

export async function getCommissionStatus(dealId: string): Promise<CommissionStatusResponse> {
    const response = await api.get(`/deals/${dealId}/commission`);
    return response.data;
}

export async function authorizeCommission(
    dealId: string,
    notes?: string
): Promise<{ success: boolean; message: string; commission_status: string }> {
    const response = await api.post(`/deals/${dealId}/commission/authorize`, {
        notes,
    });
    return response.data;
}

export async function recordPaymentWithProof(
    dealId: string,
    data: {
        entry_type: string;
        amount: number;
        description: string;
        proof_url: string;
        payment_method: string;
        bank_reference?: string;
        notes?: string;
    }
): Promise<{ success: boolean; entry_id: string; message: string }> {
    const response = await api.post(`/deals/${dealId}/ledger/payment`, data);
    return response.data;
}

export async function confirmPaymentEntry(
    dealId: string,
    entryId: string
): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/deals/${dealId}/ledger/confirm`, {
        entry_id: entryId,
    });
    return response.data;
}
