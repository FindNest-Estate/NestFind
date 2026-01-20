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
    status: string;
    date: string;
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
    recent_activity: RecentActivityItem[];
    recommended: RecommendedProperty[];
}

/**
 * Get buyer dashboard data
 */
export async function getBuyerDashboard(): Promise<BuyerDashboardResponse> {
    return get<BuyerDashboardResponse>('/buyer/dashboard');
}
