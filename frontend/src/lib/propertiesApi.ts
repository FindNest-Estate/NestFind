import { getCurrentUser } from './authApi';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Assuming cookies library or similar is used for token management in client-side calls
// For Server Components we used 'next/headers', for Client Components we rely on browser cookie handling
// or we pass tokens manually. Here we'll assume a helper exists or we read from localStorage/cookies.

// Helper to get token (simplified for now)
const getAuthToken = () => {
    // Implementation depends on auth strategy (cookies vs localStorage)
    // For this project seeing 'authApi.ts', let's check how it handles requests
    // Typically it's httpOnly cookies, so fetch automatically sends them if credentials: 'include'
    // But the backend expects 'Authorization: Bearer ...' header.
    // Let's assume we store it in a cookie accessible to JS or use a library.
    // For now, let's try reading a cookie named 'access_token' document.cookie

    if (typeof document !== 'undefined') {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; access_token=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
    }
    return null;
};

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
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
        throw new Error('Failed to save property');
    }
}

export async function unsaveProperty(propertyId: string): Promise<void> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/save`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        throw new Error('Failed to unsave property');
    }
}

export async function getSavedProperties(page = 1, perPage = 12): Promise<SavedPropertiesResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/properties/saved?page=${page}&per_page=${perPage}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error('Failed to fetch saved properties');
    }

    return response.json();
}

export async function checkIfSaved(propertyId: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/is-saved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.is_saved;
    } catch {
        return false;
    }
}

// Collections API

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

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Something went wrong' }));
        throw new Error(error.detail || 'API Request Failed');
    }

    return response.json();
}

export async function getCollections(): Promise<Collection[]> {
    return fetchWithAuth('/collections/');
}

export async function createCollection(data: CollectionCreate): Promise<Collection> {
    return fetchWithAuth('/collections/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateCollection(id: string, data: CollectionUpdate): Promise<Collection> {
    return fetchWithAuth(`/collections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteCollection(id: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/collections/${id}`, {
        method: 'DELETE',
    });
}

export async function addPropertyToCollection(collectionId: string, propertyId: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/collections/${collectionId}/items/${propertyId}`, {
        method: 'POST',
    });
}

export async function removePropertyFromCollection(collectionId: string, propertyId: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/collections/${collectionId}/items/${propertyId}`, {
        method: 'DELETE',
    });
}
