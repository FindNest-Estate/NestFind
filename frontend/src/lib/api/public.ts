/**
 * Public Property API Client
 * 
 * Functions for public property browsing (no auth required)
 */

import { get } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface PropertyCard {
    id: string;
    title: string | null;
    type: string | null;
    price: number | null;
    city: string | null;
    state: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqft: number | null;
    latitude: number | null;
    longitude: number | null;
    thumbnail_url: string | null;
    agent_name: string | null;
    created_at: string;
}

export interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
}

export interface BrowsePropertiesResponse {
    properties: PropertyCard[];
    pagination: Pagination;
}

export interface PropertyAgent {
    id: string;
    name: string;
    email: string;
}

export interface PropertyMedia {
    id: string;
    media_type: string;
    file_url: string;
    display_order: number;
    is_primary: boolean;
}

export interface ViewerContext {
    is_owner: boolean;
    is_agent: boolean;
    visit_id?: string | null;
}

export interface PropertyHighlights {
    facing: string | null;
    floor_number: number | null;
    total_floors: number | null;
    furnishing: string | null;
    possession_date: string | null;
    property_age: number | null;
    parking_spaces: number | null;
    balconies: number | null;
}

export interface PriceHistoryItem {
    price: number;
    date: string;
}

export interface PropertyDetail {
    id: string;
    title: string | null;
    description: string | null;
    type: string | null;
    price: number | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqft: number | null;
    agent: PropertyAgent | null;
    media: PropertyMedia[];
    highlights?: PropertyHighlights;
    price_history?: PriceHistoryItem[];
    viewer?: ViewerContext;  // Only populated if user is authenticated
    status: string;
    created_at: string;
    updated_at: string;
}

export interface BrowseFilters {
    page?: number;
    per_page?: number;
    city?: string;
    type?: string;
    min_price?: number;
    max_price?: number;
    bedrooms?: number;
    bathrooms?: number;
    min_area?: number;
    max_area?: number;
    keyword?: string;
    sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'area_desc' | 'area_asc';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Browse ACTIVE properties with advanced filters.
 * Public endpoint - no authentication required.
 */
export async function browseProperties(
    filters: BrowseFilters = {}
): Promise<BrowsePropertiesResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.per_page) params.append('per_page', String(filters.per_page));
    if (filters.city) params.append('city', filters.city);
    if (filters.type) params.append('type', filters.type);
    if (filters.min_price) params.append('min_price', String(filters.min_price));
    if (filters.max_price) params.append('max_price', String(filters.max_price));
    if (filters.bedrooms) params.append('bedrooms', String(filters.bedrooms));
    if (filters.bathrooms) params.append('bathrooms', String(filters.bathrooms));
    if (filters.min_area) params.append('min_area', String(filters.min_area));
    if (filters.max_area) params.append('max_area', String(filters.max_area));
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);

    const queryString = params.toString();
    const url = `/properties/browse${queryString ? `?${queryString}` : ''}`;

    return get<BrowsePropertiesResponse>(url, { skipAuth: true });
}

/**
 * Get property detail for public view.
 * Uses optional auth to include viewer context if authenticated.
 * Only ACTIVE properties are viewable.
 */
export async function getPropertyDetail(
    propertyId: string
): Promise<PropertyDetail> {
    // Don't skip auth - allow optional authentication for viewer context
    return get<PropertyDetail>(`/properties/${propertyId}/public`);
}
