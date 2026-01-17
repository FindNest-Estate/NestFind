export enum OfferStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    COUNTERED = 'COUNTERED',
    EXPIRED = 'EXPIRED',
    WITHDRAWN = 'WITHDRAWN'
}

export interface Offer {
    id: string;
    property_id: string;
    buyer_id: string;
    amount: number;
    currency: string;
    status: OfferStatus;
    expires_at: string;
    buyer_message?: string;
    seller_response?: string;
    counter_to_offer_id?: string;
    created_at: string;
    updated_at: string;

    // Joined data
    property?: {
        title: string;
        address: string;
        thumbnail_url?: string;
        price: number;
        owner_id: string;
    };
    buyer?: {
        full_name: string;
        email: string;
    };

    // UI Helpers
    allowed_actions?: string[];
}

export interface CreateOfferRequest {
    property_id: string;
    amount: number;
    buyer_message?: string;
}

export interface OfferListResponse {
    offers: Offer[];
    total: number;
    page: number;
    per_page: number;
}
