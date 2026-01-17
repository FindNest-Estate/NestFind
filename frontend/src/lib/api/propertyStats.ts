/**
 * Property Stats API Client
 * 
 * Frontend API for property analytics and statistics
 */

import { get, post } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface OwnerStats {
    saves_count: number;
    pending_visits: number;
    active_offers: number;
    highest_offer: number | null;
    last_7_days_views: number;
    inquiries_count: number;
}

export interface PropertyStats {
    property_id: string;
    days_on_market: number;
    price_per_sqft: number | null;
    total_views: number;
    is_owner: boolean;
    owner_stats: OwnerStats | null;
}

export interface SimilarProperty {
    id: string;
    title: string | null;
    type: string | null;
    price: number | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqft: number | null;
    thumbnail_url: string | null;
}

export interface SimilarPropertiesResponse {
    success: boolean;
    properties: SimilarProperty[];
}

export interface RecordViewResponse {
    success: boolean;
    counted: boolean;
    message?: string;
    total_views?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Record a property view (called on page load)
 */
export async function recordPropertyView(propertyId: string): Promise<RecordViewResponse> {
    try {
        return await post<RecordViewResponse>(`/properties/${propertyId}/view`, {});
    } catch (error) {
        console.error('Failed to record view:', error);
        return { success: false, counted: false };
    }
}

/**
 * Get property statistics
 */
export async function getPropertyStats(propertyId: string): Promise<PropertyStats | null> {
    try {
        return await get<PropertyStats>(`/properties/${propertyId}/stats`);
    } catch (error) {
        console.error('Failed to get property stats:', error);
        return null;
    }
}



/**
 * Get similar properties
 */
export async function getSimilarProperties(propertyId: string, limit: number = 6): Promise<SimilarProperty[]> {
    try {
        const response = await get<SimilarPropertiesResponse>(`/properties/${propertyId}/similar?limit=${limit}`);
        return response.properties || [];
    } catch (error) {
        console.error('Failed to get similar properties:', error);
        return [];
    }
}

// ============================================================================
// NEW API FUNCTIONS FOR ADVANCED DASHBOARD
// ============================================================================

export interface WeeklyViewStats {
    date: string;
    day_name: string;
    views: number;
}

export interface WeeklyViewsResponse {
    success: boolean;
    property_id: string;
    weekly_views: WeeklyViewStats[];
    total: number;
}

export interface ActivityItem {
    type: 'view' | 'save' | 'inquiry' | 'visit' | 'offer';
    title: string;
    timestamp: string;
    icon: string;
    relative_time?: string;
    actor?: string;
}

export interface RecentActivityResponse {
    success: boolean;
    property_id: string;
    activities: ActivityItem[];
}

export async function getWeeklyViews(propertyId: string): Promise<WeeklyViewsResponse | null> {
    try {
        return await get<WeeklyViewsResponse>(`/properties/${propertyId}/weekly-views`);
    } catch (error) {
        console.error('Failed to get weekly views:', error);
        return null;
    }
}

export async function getRecentActivity(propertyId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
        const response = await get<RecentActivityResponse>(`/properties/${propertyId}/activity?limit=${limit}`);
        return response.activities || [];
    } catch (error) {
        console.error('Failed to get recent activity:', error);
        return [];
    }
}
