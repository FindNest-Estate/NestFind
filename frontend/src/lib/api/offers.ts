import { get, post } from '@/lib/api';
import {
    Offer,
    CreateOfferRequest,
    OfferListResponse
} from '@/lib/types/offer';

/**
 * Create an offer (Buyer)
 */
export async function createOffer(
    data: CreateOfferRequest
): Promise<{ success: boolean; offer_id: string }> {
    return post<{ success: boolean; offer_id: string }>('/offers', data);
}

/**
 * Get offers list (Buyer/Seller)
 */
export async function getOffers(
    status?: string,
    page = 1,
    perPage = 20
): Promise<OfferListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    return get<OfferListResponse>(`/offers?${params.toString()}`);
}

/**
 * Get offer details by ID
 */
export async function getOfferById(
    offerId: string
): Promise<{ success: boolean; offer: Offer }> {
    return get<{ success: boolean; offer: Offer }>(`/offers/${offerId}`);
}

/**
 * Accept an offer (Seller)
 */
export async function acceptOffer(
    offerId: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/offers/${offerId}/accept`);
}

/**
 * Reject an offer (Seller)
 */
export async function rejectOffer(
    offerId: string,
    reason?: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/offers/${offerId}/reject`, { reason });
}

/**
 * Counter an offer (Seller)
 */
export async function counterOffer(
    offerId: string,
    amount: number,
    message?: string
): Promise<{ success: boolean; parent_offer_id: string }> {
    return post<{ success: boolean; parent_offer_id: string }>(`/offers/${offerId}/counter`, {
        counter_price: amount,
        message
    });
}

/**
 * Withdraw an offer (Buyer)
 */
export async function withdrawOffer(
    offerId: string
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/offers/${offerId}/withdraw`);
}
