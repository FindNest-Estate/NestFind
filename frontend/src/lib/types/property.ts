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

export enum PropertySubType {
    // Apartment
    FLAT = 'FLAT',
    STUDIO = 'STUDIO',
    PENTHOUSE = 'PENTHOUSE',
    DUPLEX = 'DUPLEX',
    // House
    INDEPENDENT_HOUSE = 'INDEPENDENT_HOUSE',
    VILLA = 'VILLA',
    BUNGALOW = 'BUNGALOW',
    ROW_HOUSE = 'ROW_HOUSE',
    // Land
    PLOT = 'PLOT',
    FARMLAND = 'FARMLAND',
    PLANTATION = 'PLANTATION',
    INDUSTRIAL_PLOT = 'INDUSTRIAL_PLOT',
    // Commercial
    OFFICE = 'OFFICE',
    SHOP = 'SHOP',
    WAREHOUSE = 'WAREHOUSE',
    CO_WORKING = 'CO_WORKING'
}

export type FurnishingStatus = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED';
export type FacingDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'NE' | 'NW' | 'SE' | 'SW';
export type OwnershipType = 'SINGLE' | 'JOINT' | 'COMPANY';
export type AvailabilityStatus = 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION' | 'IMMEDIATE';
export type LandType = 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL';

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
    property_sub_type: PropertySubType | null;
    // Pricing
    price: number | null;
    price_negotiable: boolean | null;
    maintenance_charges: number | null;
    // Location
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    // Dimensions
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqft: number | null;
    floor_number: number | null;
    total_floors: number | null;
    balconies: number | null;
    // Features
    furnishing_status: FurnishingStatus | null;
    facing_direction: FacingDirection | null;
    parking_available: boolean | null;
    parking_count: number | null;
    // Land-specific
    road_access: boolean | null;
    land_type: LandType | null;
    // Listing details
    listing_type: string | null;
    availability_status: AvailabilityStatus | null;
    property_age_years: number | null;
    ownership_type: OwnershipType | null;
    // Amenities
    amenities: string[];
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
    property_sub_type?: PropertySubType;
    // Pricing
    price?: number;
    price_negotiable?: boolean;
    maintenance_charges?: number;
    // Location
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    // Dimensions
    bedrooms?: number;
    bathrooms?: number;
    area_sqft?: number;
    floor_number?: number;
    total_floors?: number;
    balconies?: number;
    // Features
    furnishing_status?: FurnishingStatus;
    facing_direction?: FacingDirection;
    parking_available?: boolean;
    parking_count?: number;
    // Land-specific
    road_access?: boolean;
    land_type?: LandType;
    // Listing details
    listing_type?: string;
    availability_status?: AvailabilityStatus;
    property_age_years?: number;
    ownership_type?: OwnershipType;
    // Amenities
    amenities?: string[];
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
