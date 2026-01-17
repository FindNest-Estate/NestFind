export enum TransactionStatus {
    INITIATED = 'INITIATED',
    BUYER_VERIFIED = 'BUYER_VERIFIED',
    SELLER_VERIFIED = 'SELLER_VERIFIED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export interface Transaction {
    id: string;
    reservation_id?: string;
    property_id: string;
    buyer_id: string;
    seller_id: string;
    agent_id: string;
    status: TransactionStatus;
    display_status?: string;
    total_price?: number;
    final_price?: number;
    platform_fee?: number;
    agent_commission?: number;
    commission?: number;
    currency?: string;
    registration_date?: string;
    registration_location?: string;
    completed_at?: string;
    created_at: string;
    updated_at?: string;

    // List view fields
    property_title?: string;
    property_city?: string;
    buyer_name?: string;
    seller_name?: string;
    agent_name?: string;

    // Detail view nested objects
    property?: {
        id?: string;
        title: string;
        city?: string;
        address?: string;
        thumbnail_url?: string;
    };
    buyer?: {
        id?: string;
        name?: string;
        full_name?: string;
        email?: string;
        verified?: boolean;
    };
    seller?: {
        id?: string;
        name?: string;
        full_name?: string;
        email?: string;
        verified?: boolean;
    };
    agent?: {
        id?: string;
        name?: string;
        full_name?: string;
        email?: string;
    };

    // UI Helpers
    allowed_actions?: string[];
}

export interface CreateTransactionRequest {
    reservation_id: string;
    registration_date: string;
    registration_location?: string;
}

export interface TransactionListResponse {
    success: boolean;
    transactions: Transaction[];
    pagination?: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
}

