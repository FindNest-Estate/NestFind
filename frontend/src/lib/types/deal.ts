/**
 * Deal Types — TypeScript interfaces for the unified deal entity.
 */

export enum DealStatus {
    INITIATED = 'INITIATED',
    VISIT_SCHEDULED = 'VISIT_SCHEDULED',
    OFFER_MADE = 'OFFER_MADE',
    NEGOTIATION = 'NEGOTIATION',
    PRICE_AGREED = 'PRICE_AGREED',
    TOKEN_PENDING = 'TOKEN_PENDING',
    TOKEN_PAID = 'TOKEN_PAID',
    AGREEMENT_SIGNED = 'AGREEMENT_SIGNED',
    REGISTRATION = 'REGISTRATION',
    COMPLETED = 'COMPLETED',
    COMMISSION_RELEASED = 'COMMISSION_RELEASED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}

export const ACTIVE_DEAL_STATUSES = new Set([
    DealStatus.INITIATED,
    DealStatus.VISIT_SCHEDULED,
    DealStatus.OFFER_MADE,
    DealStatus.NEGOTIATION,
    DealStatus.PRICE_AGREED,
    DealStatus.TOKEN_PENDING,
    DealStatus.TOKEN_PAID,
    DealStatus.AGREEMENT_SIGNED,
    DealStatus.REGISTRATION,
]);

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
    [DealStatus.INITIATED]: 'Deal Started',
    [DealStatus.VISIT_SCHEDULED]: 'Visit Scheduled',
    [DealStatus.OFFER_MADE]: 'Offer Submitted',
    [DealStatus.NEGOTIATION]: 'In Negotiation',
    [DealStatus.PRICE_AGREED]: 'Price Agreed',
    [DealStatus.TOKEN_PENDING]: 'Awaiting Token',
    [DealStatus.TOKEN_PAID]: 'Token Paid',
    [DealStatus.AGREEMENT_SIGNED]: 'Agreement Signed',
    [DealStatus.REGISTRATION]: 'At Registration',
    [DealStatus.COMPLETED]: 'Completed',
    [DealStatus.COMMISSION_RELEASED]: 'Commission Released',
    [DealStatus.CANCELLED]: 'Cancelled',
    [DealStatus.EXPIRED]: 'Expired',
};

/** Ordered lifecycle steps for the stepper */
export const DEAL_LIFECYCLE_STEPS: DealStatus[] = [
    DealStatus.INITIATED,
    DealStatus.VISIT_SCHEDULED,
    DealStatus.OFFER_MADE,
    DealStatus.NEGOTIATION,
    DealStatus.PRICE_AGREED,
    DealStatus.TOKEN_PENDING,
    DealStatus.TOKEN_PAID,
    DealStatus.AGREEMENT_SIGNED,
    DealStatus.REGISTRATION,
    DealStatus.COMPLETED,
    DealStatus.COMMISSION_RELEASED,
];

export interface Deal {
    id: string;
    property_id: string;
    property_title: string;
    buyer_id: string;
    seller_id: string;
    agent_id: string;
    status: DealStatus;
    display_status: string;
    is_active: boolean;

    // Linked entities
    visit_request_id?: string | null;
    offer_id?: string | null;
    reservation_id?: string | null;
    transaction_id?: string | null;

    // Financial
    agreed_price?: number | null;
    token_amount?: number | null;
    commission_amount?: number | null;
    platform_fee?: number | null;
    agent_commission?: number | null;

    // Timestamps
    created_at: string;
    updated_at: string;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;

    // List view extras
    property_city?: string;
    property_type?: string;
    buyer_name?: string;
    seller_name?: string;
    agent_name?: string;
    viewer_role?: 'BUYER' | 'SELLER' | 'AGENT' | 'ADMIN';
    allowed_actions?: string[];

    // Phase 3: Execution Readiness
    execution_stage?: string | null;  // e.g. 'AWAITING_DOCS', 'DOCS_REVIEW', 'READY_FOR_REGISTRATION'
    is_frozen?: boolean; // Phase 4B
    freeze_reason?: string;
    registration_date?: string | null; // ISO Date string
    registration_notes?: string | null;
}

export interface DealDetail extends Deal {
    property: {
        id: string;
        title: string;
        city: string;
        address: string;
        price: number | null;
        type: string;
        status: string;
        bedrooms?: number | null;
        bathrooms?: number | null;
        area_sqft?: number | null;
    };
    parties: {
        buyer: { id: string; name: string; email?: string; mobile_number?: string; };
        seller: { id: string; name: string; email?: string; mobile_number?: string; };
        agent: { id: string; name: string; email?: string; mobile_number?: string; rating?: number | null; total_cases?: number | null; };
    };
    reservation?: {
        id: string;
        status: string;
        proof_url?: string;
    } | null;
    timeline: DealEvent[];
}

export interface DealEvent {
    id: string;
    deal_id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    actor_id: string;
    actor_role: string;
    actor_name?: string;
    notes?: string | null;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface DealListResponse {
    success: boolean;
    deals: Deal[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
}

export interface DealDetailResponse {
    success: boolean;
    deal: DealDetail;
}

export interface DealTransitionResponse {
    success: boolean;
    deal: Deal;
    transition: {
        from: string;
        to: string;
        display_from: string;
        display_to: string;
    };
    message: string;
}

export interface CreateDealRequest {
    property_id: string;
    notes?: string;
}

export interface TransitionDealRequest {
    new_status: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}
