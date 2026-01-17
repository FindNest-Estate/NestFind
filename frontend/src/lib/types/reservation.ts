export enum ReservationStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'
}

export interface Reservation {
    id: string;
    property_id: string;
    buyer_id: string;
    offer_id: string;
    status: ReservationStatus;
    reserved_until: string;
    deposit_amount: number;
    currency: string;
    payment_reference?: string;
    created_at: string;
    updated_at: string;

    // Joined data
    property?: {
        title: string;
        address: string;
        thumbnail_url?: string;
    };

    // UI Helpers
    allowed_actions?: string[];
}

export interface CreateReservationRequest {
    offer_id: string;
    payment_reference?: string;
    payment_method?: string;
}

export interface ReservationListResponse {
    reservations: Reservation[];
    total: number;
    page: number;
    per_page: number;
}
