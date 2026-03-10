export type DisputeType =
    | 'BOOKING_PROOF_DISPUTED'
    | 'AMOUNT_MISMATCH'
    | 'COMMISSION_DISPUTE'
    | 'DOCUMENT_INCOMPLETE'
    | 'OTHER';

export type DisputeStatus =
    | 'OPEN'
    | 'UNDER_REVIEW'
    | 'RESOLVED'
    | 'REJECTED';

export interface Dispute {
    id: string;
    deal_id: string;
    raised_by: string; // User ID
    raised_by_name: string;
    raised_by_role: string;
    type: DisputeType;
    status: DisputeStatus;
    description: string;
    admin_notes?: string;
    evidence_urls: string[];
    created_at: string;
    resolved_at?: string;
}

export interface RaiseDisputeRequest {
    type: DisputeType;
    description: string;
    evidence_urls?: string[];
}

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
    'BOOKING_PROOF_DISPUTED': 'Booking Proof Invalid/Fake',
    'AMOUNT_MISMATCH': 'Declared Amount Mismatch',
    'COMMISSION_DISPUTE': 'Commission Calculation Error',
    'DOCUMENT_INCOMPLETE': 'Required Documents Missing',
    'OTHER': 'Other Issue'
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
    'OPEN': 'bg-red-100 text-red-800 border-red-200',
    'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'RESOLVED': 'bg-green-100 text-green-800 border-green-200',
    'REJECTED': 'bg-gray-100 text-gray-800 border-gray-200'
};
