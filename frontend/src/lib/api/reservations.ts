import { get, post } from '@/lib/api';
import {
    Reservation,
    CreateReservationRequest,
    ReservationListResponse
} from '@/lib/types/reservation';

/**
 * Create a reservation from an accepted offer (Buyer)
 */
export async function createReservation(
    data: CreateReservationRequest
): Promise<{ success: boolean; reservation_id: string }> {
    return post<{ success: boolean; reservation_id: string }>('/reservations', data);
}

/**
 * Get reservations list
 */
export async function getReservations(
    status?: string,
    page = 1,
    perPage = 20
): Promise<ReservationListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    return get<ReservationListResponse>(`/reservations?${params.toString()}`);
}

/**
 * Get reservation details by ID
 */
export async function getReservationById(
    reservationId: string
): Promise<{ success: boolean; reservation: Reservation }> {
    return get<{ success: boolean; reservation: Reservation }>(`/reservations/${reservationId}`);
}

/**
 * Cancel a reservation (Buyer)
 */
export async function cancelReservation(
    reservationId: string,
    reason?: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/reservations/${reservationId}/cancel`, { reason });
}
