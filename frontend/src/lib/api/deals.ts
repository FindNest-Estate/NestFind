import { get, post } from '@/lib/api';
import {
    DealListResponse,
    DealDetailResponse,
    DealTransitionResponse,
    CreateDealRequest,
    TransitionDealRequest,
    DealEvent,
} from '@/lib/types/deal';

/**
 * Create a new deal (Buyer initiates)
 */
export async function createDeal(
    data: CreateDealRequest
): Promise<{ success: boolean; deal: DealDetailResponse['deal']; message: string }> {
    return post('/deals', data);
}

/**
 * List deals for current user (role-aware)
 */
export async function getDeals(
    options: {
        status?: string;
        active_only?: boolean;
        page?: number;
        per_page?: number;
    } = {}
): Promise<DealListResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.active_only) params.append('active_only', 'true');
    params.append('page', (options.page || 1).toString());
    params.append('per_page', (options.per_page || 20).toString());

    return get<DealListResponse>(`/deals?${params.toString()}`);
}

/**
 * Get deal detail with timeline
 */
export async function getDeal(
    dealId: string
): Promise<DealDetailResponse> {
    return get<DealDetailResponse>(`/deals/${dealId}`);
}

/**
 * Advance deal to next state
 */
export async function transitionDeal(
    dealId: string,
    data: TransitionDealRequest
): Promise<DealTransitionResponse> {
    return post<DealTransitionResponse>(`/deals/${dealId}/transition`, data);
}

/**
 * Cancel a deal
 */
export async function cancelDeal(
    dealId: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    return post(`/deals/${dealId}/cancel`, { reason });
}

/**
 * Get deal event timeline
 */
export async function getDealTimeline(
    dealId: string,
    limit = 100,
    offset = 0
): Promise<{ success: boolean; events: DealEvent[]; total: number }> {
    return get(`/deals/${dealId}/timeline?limit=${limit}&offset=${offset}`);
}
