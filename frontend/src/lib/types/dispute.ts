export enum DisputeStatus {
    OPEN = 'OPEN',
    UNDER_REVIEW = 'UNDER_REVIEW',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

export enum DisputeCategory {
    PROPERTY_MISREPRESENTATION = 'PROPERTY_MISREPRESENTATION',
    AGENT_CONDUCT = 'AGENT_CONDUCT',
    BUYER_NO_SHOW = 'BUYER_NO_SHOW',
    PAYMENT_ISSUE = 'PAYMENT_ISSUE',
    OTHER = 'OTHER'
}

export enum DisputeDecision {
    REFUND = 'REFUND',
    NO_REFUND = 'NO_REFUND',
    PARTIAL_REFUND = 'PARTIAL_REFUND',
    WARNING = 'WARNING',
    BAN = 'BAN',
    DISMISSED = 'DISMISSED'
}

export interface Dispute {
    id: string;
    raised_by_id: string;
    against_id?: string;
    property_id?: string;
    transaction_id?: string;
    category: DisputeCategory;
    status: DisputeStatus;
    title: string;
    description: string;
    admin_assigned_id?: string;
    resolution_notes?: string;
    decision?: DisputeDecision;
    resolved_at?: string;
    created_at: string;
    updated_at: string;

    // Joined data
    raised_by?: {
        full_name: string;
        email: string;
    };
    against?: {
        full_name: string;
        email: string;
    };
    assigned_admin?: {
        full_name: string;
        email: string;
    };

    // UI Helpers
    allowed_actions?: string[];
}

export interface CreateDisputeRequest {
    against_id?: string; // Optional if generic
    property_id?: string;
    category: DisputeCategory;
    title: string;
    description: string;
}

export interface DisputeListResponse {
    disputes: Dispute[];
    total: number;
    page: number;
    per_page: number;
}
