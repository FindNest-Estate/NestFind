/**
 * Property Type Definitions
 * Mirrors backend schemas from property_schemas.py
 */

export enum PropertyType {
    LAND = 'LAND',
    HOUSE = 'HOUSE',
    APARTMENT = 'APARTMENT',
    COMMERCIAL = 'COMMERCIAL'
}

export enum PropertyStatus {
    DRAFT = 'DRAFT',
    PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
    ASSIGNED = 'ASSIGNED',
    VERIFICATION_IN_PROGRESS = 'VERIFICATION_IN_PROGRESS',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    RESERVED = 'RESERVED',
    SOLD = 'SOLD'
}

export type AllowedAction = 'edit' | 'delete' | 'view' | 'hire_agent' | 'cancel';

export interface VisibilityFlags {
    show_analytics: boolean;
    show_offers: boolean;
    show_visits: boolean;
    show_agent: boolean;
}

export interface AgentSummary {
    id: string;
    name: string;
    status: string;
    requested_at?: string;
}

export interface PropertyStats {
    views: number;
    visits_requested: number;
    offers_pending: number;
}

export interface PropertyMediaResponse {
    id: string;
    media_type: string;
    file_url: string;
    file_size_bytes?: number;
    original_filename?: string;
    display_order: number;
    is_primary: boolean;
    uploaded_at?: string;
}

// Completeness (computed by backend, never frontend)
export type CompletenessLevel = 'BASIC' | 'READY_FOR_AGENT';

export interface Completeness {
    level: CompletenessLevel;
    percentage: number;
    can_hire_agent: boolean;
    missing_fields: string[];
}

export interface PropertyDetail {
    id: string;
    title: string | null;
    description: string | null;
    type: PropertyType | null;
    price: number | null;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    city: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqft: number | null;

    // State
    status: PropertyStatus;
    display_status: string;

    // Actions
    allowed_actions: AllowedAction[];

    // Visibility
    visibility: VisibilityFlags;

    // Optional relations
    agent?: AgentSummary | null;
    stats?: PropertyStats | null;
    media: PropertyMediaResponse[];

    // Completeness (from backend - NEVER compute on frontend)
    completeness?: Completeness;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface PropertyListItem {
    id: string;
    title: string | null;
    status: PropertyStatus;
    display_status: string;
    address_preview: string | null;
    price: number | null;
    thumbnail_url: string | null;
    created_at: string;
    allowed_actions: AllowedAction[];
    visibility: VisibilityFlags;
    agent?: AgentSummary | null;
    stats?: PropertyStats | null;
}

export interface CreatePropertyRequest {
    title?: string;
    type?: PropertyType;
}

export interface CreatePropertyResponse {
    id: string;
    status: PropertyStatus;
    display_status: string;
    allowed_actions: AllowedAction[];
    next_action: {
        label: string;
        route?: string;
    };
}

export interface UpdatePropertyRequest {
    title?: string;
    description?: string;
    type?: PropertyType;
    price?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    bedrooms?: number;
    bathrooms?: number;
    area_sqft?: number;
}

export interface UpdatePropertyResponse {
    id: string;
    status: PropertyStatus;
    display_status: string;
    allowed_actions: AllowedAction[];
    completeness: Completeness;
}

export interface DeletePropertyResponse {
    success: boolean;
    message: string;
}
