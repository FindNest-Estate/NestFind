import { Agent } from '@/types/agent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AgentsResponse {
    agents: Agent[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
        has_more: boolean;
    };
    search_location?: {
        latitude: number;
        longitude: number;
        radius_km: number;
    };
}

export async function getPublicAgents(params: {
    page?: number;
    per_page?: number;
    city?: string;
    min_rating?: number;
}): Promise<AgentsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.city) searchParams.append('city', params.city);
    if (params.min_rating) searchParams.append('min_rating', params.min_rating.toString());

    const response = await fetch(`${API_BASE_URL}/agents/public/browse?${searchParams.toString()}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch agents');
    }

    return response.json();
}

export async function getNearbyAgents(params: {
    latitude: number;
    longitude: number;
    radius_km?: number;
    page?: number;
    per_page?: number;
}): Promise<AgentsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('latitude', params.latitude.toString());
    searchParams.append('longitude', params.longitude.toString());
    if (params.radius_km) searchParams.append('radius_km', params.radius_km.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());

    const response = await fetch(`${API_BASE_URL}/agents/public/nearby?${searchParams.toString()}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch nearby agents');
    }

    return response.json();
}

export async function getAgentProfile(id: string): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/agents/public/${id}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch agent profile');
    }

    return response.json();
}
