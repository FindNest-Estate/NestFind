import { get } from '@/lib/api';

export interface DashboardStats {
    active_offers: number;
    upcoming_visits: number;
    saved_properties: number;
    unread_messages: number;
}

export interface RecentActivityItem {
    id: string;
    type: 'visit' | 'offer';
    title: string;
    location: string;
    status: string;
    date: string | null;
    amount?: number | null;
    image: string;
}

export interface ActionRequiredItem {
    id: string;
    type: 'visit' | 'offer';
    urgency: string;
    title: string;
    message: string;
    link: string;
    created_at: string | null;
}

export interface RecommendedProperty {
    id: string;
    title: string;
    price: number;
    location: string;
    specs: string;
    image: string;
}

export interface BuyerDashboardResponse {
    success: boolean;
    stats: DashboardStats;
    action_required: ActionRequiredItem[];
    recent_activity: RecentActivityItem[];
    recommended: RecommendedProperty[];
}

/**
 * Get buyer dashboard data
 */
export async function getBuyerDashboard(): Promise<BuyerDashboardResponse> {
    return get<BuyerDashboardResponse>('/buyer/dashboard');
}

export interface ActiveOffer {
    id: string;
    property_id: string;
    property_title: string;
    offered_price: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'WITHDRAWN' | 'EXPIRED';
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
}

export interface ActiveOffersResponse {
    success: boolean;
    offers: ActiveOffer[];
}

export interface ActiveDeal {
    id: string;
    property_id: string;
    property_title: string;
    status: string;
    agreed_price: number;
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
}

export interface ActiveDealsResponse {
    success: boolean;
    deals: ActiveDeal[];
}

export async function getActiveOffers(): Promise<ActiveOffer[]> {
    try {
        const response = await get<ActiveOffersResponse>('/offers?role=buyer');
        return response.offers.filter(o => ['PENDING', 'COUNTERED', 'ACCEPTED'].includes(o.status));
    } catch (e) {
        console.error('Failed to fetch active offers:', e);
        return [];
    }
}

export async function getActiveDeals(): Promise<ActiveDeal[]> {
    try {
        const response = await get<ActiveDealsResponse>('/deals?active_only=true');
        return response.deals;
    } catch (e) {
        console.error('Failed to fetch active deals:', e);
        return [];
    }
}

export interface UpcomingVisit {
    id: string;
    property_id: string;
    property_title: string;
    property_city: string;
    preferred_date: string;
    status: string;
    thumbnail_url?: string;
    agent_id?: string;
    agent_name?: string;
}

export interface UpcomingVisitsResponse {
    success: boolean;
    visits: UpcomingVisit[];
}

export async function getUpcomingVisits(): Promise<UpcomingVisit[]> {
    try {
        const response = await get<UpcomingVisitsResponse>('/visits?role=buyer&status=APPROVED');
        return response.visits || [];
    } catch (e) {
        console.error('Failed to fetch upcoming visits:', e);
        return [];
    }
}

export interface SavedPropertyPreview {
    id: string;
    title: string;
    price: number;
    city: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    status: string;
    thumbnail_url?: string;
}

export interface SavedPropertiesListResponse {
    properties: SavedPropertyPreview[];
}

export async function getSavedPropertiesPreview(): Promise<SavedPropertyPreview[]> {
    try {
        const response = await get<SavedPropertiesListResponse>('/properties/saved?per_page=6');
        return response.properties || [];
    } catch (e) {
        console.error('Failed to fetch saved properties:', e);
        return [];
    }
}

export interface RecentConversation {
    id: string;
    other_party: {
        name: string;
        role: string;
    };
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
}

export interface ConversationsResponse {
    conversations: RecentConversation[];
}

export async function getRecentConversations(): Promise<RecentConversation[]> {
    try {
        const response = await get<ConversationsResponse>('/conversations?per_page=3');
        return response.conversations || [];
    } catch (e) {
        console.error('Failed to fetch recent conversations:', e);
        return [];
    }
}
