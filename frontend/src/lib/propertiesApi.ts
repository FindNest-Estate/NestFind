/**
 * Properties API Client
 * 
 * Handles saved properties and collections.
 * Uses centralized apiClient for auth, error handling, and token refresh.
 */

import { get, post, del, put } from './api';

// ============================================================================
// Saved Properties
// ============================================================================

export interface SavedProperty {
    id: string;
    title: string;
    type: string;
    price: number;
    city: string;
    state: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    status: string;
    thumbnail_url: string;
    notes?: string;
    saved_price?: number;
    saved_at: string;
}

export interface SavedPropertiesResponse {
    properties: SavedProperty[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
        has_more: boolean;
    };
}

export async function saveProperty(propertyId: string, notes?: string): Promise<void> {
    await post(`/properties/${propertyId}/save`, { notes });
}

export async function unsaveProperty(propertyId: string): Promise<void> {
    await del(`/properties/${propertyId}/save`);
}

export async function getSavedProperties(page = 1, perPage = 12): Promise<SavedPropertiesResponse> {
    return get<SavedPropertiesResponse>(`/properties/saved?page=${page}&per_page=${perPage}`);
}

export async function checkIfSaved(propertyId: string): Promise<boolean> {
    try {
        const data = await get<{ is_saved: boolean }>(`/properties/${propertyId}/is-saved`);
        return data.is_saved;
    } catch {
        return false;
    }
}

// ============================================================================
// Collections
// ============================================================================

export interface Collection {
    id: string;
    name: string;
    color: string;
    property_count: number;
    created_at: string;
    updated_at: string;
}

export interface CollectionCreate {
    name: string;
    color: string;
}

export interface CollectionUpdate {
    name?: string;
    color?: string;
}

export async function getCollections(): Promise<Collection[]> {
    return get<Collection[]>('/collections/');
}

export async function createCollection(data: CollectionCreate): Promise<Collection> {
    return post<Collection>('/collections/', data);
}

export async function updateCollection(id: string, data: CollectionUpdate): Promise<Collection> {
    return put<Collection>(`/collections/${id}`, data);
}

export async function deleteCollection(id: string): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/collections/${id}`);
}

export async function addPropertyToCollection(collectionId: string, propertyId: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/collections/${collectionId}/items/${propertyId}`);
}

export async function removePropertyFromCollection(collectionId: string, propertyId: string): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/collections/${collectionId}/items/${propertyId}`);
}
