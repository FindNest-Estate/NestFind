/**
 * Admin API Client
 * 
 * Functions for admin operations (requires ADMIN role)
 */

import { get, post } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface PendingAgent {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    status: string;

    pan_number: string | null;
    aadhaar_number: string | null;
    service_radius: number | null;
    submitted_at: string;
}

export interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
}

export interface PendingAgentsResponse {
    agents: PendingAgent[];
    pagination: Pagination;
}

export interface AgentDecisionResponse {
    status: string;
}

export interface AgentHistory {
    action: string;
    timestamp: string;
    admin_name: string;
    reason?: string;
}

export interface AgentDetail {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    status: string;
    submitted_at: string;
    address: string | null;
    coordinates: {
        lat: number;
        lng: number;
    } | null;
    profile: {
        pan_number: string | null;
        aadhaar_number: string | null;
        service_radius: number | null;
    };
}

export interface AgentDetailResponse {
    success: boolean;
    agent: AgentDetail;
    history: AgentHistory[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get full agent details.
 * Requires ADMIN role.
 */
export async function getAgentDetails(agentId: string): Promise<AgentDetailResponse> {
    return get<AgentDetailResponse>(`/admin/agents/${agentId}`);
}

/**
 * Get covered areas for a location.
 * Requires ADMIN role.
 */
export async function getAgentCoverage(lat: number, lng: number, radius: number): Promise<any> {
    return get<any>(`/admin/agents/coverage/check?lat=${lat}&lng=${lng}&radius=${radius}`);
}

/**
 * Get list of agents pending approval.
 * Requires ADMIN role.
 */
export async function getPendingAgents(
    page: number = 1,
    perPage: number = 20
): Promise<PendingAgentsResponse> {
    return get<PendingAgentsResponse>(`/admin/agents/pending?page=${page}&per_page=${perPage}`);
}

/**
 * Approve an agent.
 * Requires ADMIN role.
 */
export async function approveAgent(
    agentId: string,
    reason?: string
): Promise<AgentDecisionResponse> {
    return post<AgentDecisionResponse>(`/admin/agents/${agentId}/approve`, {
        decision_reason: reason
    });
}

/**
 * Decline an agent.
 * Requires ADMIN role.
 */
export async function declineAgent(
    agentId: string,
    reason?: string
): Promise<AgentDecisionResponse> {
    return post<AgentDecisionResponse>(`/admin/agents/${agentId}/decline`, {
        decision_reason: reason
    });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface PlatformOverview {
    total_revenue: number;
    transaction_volume: number;
    total_users: number;
    total_agents: number;
    active_listings: number;
    pending_verifications: number;
}

export async function getPlatformOverview(): Promise<{ success: boolean; data: PlatformOverview }> {
    return get<{ success: boolean; data: PlatformOverview }>('/admin/analytics/overview');
}

export interface RevenueTrend {
    date: string;
    revenue: number;
    deals: number;
}

export async function getRevenueTrends(days = 30): Promise<{ success: boolean; data: RevenueTrend[] }> {
    return get<{ success: boolean; data: RevenueTrend[] }>(`/admin/analytics/revenue-trends?days=${days}`);
}

