import { get, post, put, del } from '@/lib/api';
import {
    PropertyDetail,
    CreatePropertyRequest,
    CreatePropertyResponse,
    UpdatePropertyRequest,
    UpdatePropertyResponse,
    DeletePropertyResponse
} from '@/lib/types/property';

/**
 * Property Status Enum
 * MUST match backend enum strictly.
 */
export enum PropertyStatus {
    DRAFT = 'DRAFT',
    PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
    ASSIGNED = 'ASSIGNED',
    VERIFICATION_IN_PROGRESS = 'VERIFICATION_IN_PROGRESS',
    ACTIVE = 'ACTIVE',
    RESERVED = 'RESERVED',
    SOLD = 'SOLD',
}

export type AllowedAction = 'edit' | 'delete' | 'view' | 'publish' | 'pause';

export interface PropertySummary {
    id: string; // UUID
    title: string;
    status: PropertyStatus;
    display_status: string; // Human readable
    price: number | null;
    currency: string;
    thumbnail_url: string | null;
    created_at: string;
    updated_at: string;
    allowed_actions: AllowedAction[];
    visibility: {
        is_public: boolean;
        is_searchable: boolean;
    };
    agent?: {
        name: string;
        id: string;
    } | null;
    stats?: {
        views: number;
        saves: number;
        inquiries: number;
    } | null;
}

export interface PropertyListResponse {
    properties: PropertySummary[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
}

/**
 * Fetch seller's property list.
 * STRICT: Returns only what backend provides.
 */
export async function getSellerProperties(
    page = 1,
    perPage = 20
): Promise<PropertyListResponse> {
    // api.get handles Authorization header and base URL automatically
    return get<PropertyListResponse>(`/seller/properties?page=${page}&per_page=${perPage}`);
}

/**
 * Create a new property in DRAFT state.
 * Returns property ID and next action.
 */
export async function createProperty(
    data: CreatePropertyRequest
): Promise<CreatePropertyResponse> {
    return post<CreatePropertyResponse>('/properties', data);
}

/**
 * Get property details by ID.
 * Returns full property with all fields and state.
 */
export async function getProperty(
    propertyId: string
): Promise<PropertyDetail> {
    return get<PropertyDetail>(`/properties/${propertyId}`);
}

/**
 * Update property fields.
 * Only allowed in DRAFT state.
 */
export async function updateProperty(
    propertyId: string,
    updates: UpdatePropertyRequest
): Promise<UpdatePropertyResponse> {
    return put<UpdatePropertyResponse>(`/properties/${propertyId}`, updates);
}

/**
 * Delete property (soft delete).
 * Only allowed in DRAFT state.
 */
export async function deleteProperty(
    propertyId: string
): Promise<DeletePropertyResponse> {
    return del<DeletePropertyResponse>(`/properties/${propertyId}`);
}

/**
 * Request agent assignment.
 * Transitions property from DRAFT to PENDING_ASSIGNMENT.
 */
export interface HireAgentResponse {
    success: boolean;
    assignment_id: string;
    agent_name: string;
    new_status: string;
}

export async function hireAgent(
    propertyId: string
): Promise<HireAgentResponse> {
    return post<HireAgentResponse>(`/properties/${propertyId}/hire-agent`, {});
}

// ============================================================================
// MEDIA API FUNCTIONS
// ============================================================================

export interface MediaItem {
    id: string;
    media_type: string;
    file_url: string;
    file_size_bytes: number;
    original_filename: string;
    display_order: number;
    is_primary: boolean;
    uploaded_at?: string;
}

export interface UploadMediaResponse {
    success: boolean;
    media: MediaItem;
}

export interface ListMediaResponse {
    media: MediaItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Upload a media file for a property.
 * Uses FormData for file upload.
 */
export async function uploadPropertyMedia(
    propertyId: string,
    file: File
): Promise<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/media`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        // Don't set Content-Type - browser sets it with boundary for multipart
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Upload failed with status ${response.status}`);
    }

    return response.json();
}

/**
 * List all media for a property.
 */
export async function getPropertyMedia(
    propertyId: string
): Promise<ListMediaResponse> {
    return get<ListMediaResponse>(`/properties/${propertyId}/media`);
}

/**
 * Delete a media item.
 */
export async function deletePropertyMedia(
    propertyId: string,
    mediaId: string
): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/properties/${propertyId}/media/${mediaId}`);
}

/**
 * Set a media item as the primary image.
 */
export async function setMediaPrimary(
    propertyId: string,
    mediaId: string
): Promise<{ success: boolean }> {
    return put<{ success: boolean }>(`/properties/${propertyId}/media/${mediaId}/primary`, {});
}
