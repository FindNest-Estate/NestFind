/**
 * Admin API Client
 * 
 * Functions for admin operations (requires ADMIN role)
 */

import { get, post } from '@/lib/api';
import queryString from 'query-string';

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


// ============================================================================
// AUDIT LOGS
// ============================================================================

export interface AuditLogItem {
    id: string;
    user_id: string | null;
    user_name: string;
    user_email: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    details: string | null;
    ip_address: string | null;
    timestamp: string;
}

export interface AuditLogResponse {
    items: AuditLogItem[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

export interface AuditLogFilters {
    page?: number;
    per_page?: number;
    action?: string;
    user_id?: string;
    entity_type?: string;
}

export async function getAuditLogs(params: AuditLogFilters): Promise<AuditLogResponse> {
    const qs = queryString.stringify(params, { skipNull: true, skipEmptyString: true });
    return get<AuditLogResponse>(`/admin/audit-logs?${qs}`);
}

// ============================================================================
// GLOBAL SEARCH HELPERS
// ============================================================================

export interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    type: 'user' | 'property' | 'agent' | 'transaction';
    url: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const results: SearchResult[] = [];

    try {
        const [usersOut, propsOut, txnsOut] = await Promise.allSettled([
            get<{ users: any[] }>(`/admin/users?search=${query}&per_page=3`),
            get<{ properties: any[] }>(`/admin/properties?search=${query}&per_page=3`),
            get<{ transactions: any[] }>(`/admin/transactions?search=${query}&per_page=3`)
        ]);

        // Process Users
        if (usersOut.status === 'fulfilled' && usersOut.value.users) {
            usersOut.value.users.forEach((u: any) => {
                results.push({
                    id: u.id,
                    title: u.full_name,
                    subtitle: `${u.role.toUpperCase()} • ${u.email}`,
                    type: u.role === 'agent' ? 'agent' : 'user',
                    url: u.role === 'agent' ? `/admin/agents/${u.id}` : `/admin/users/${u.id}`
                });
            });
        }

        // Process Properties
        if (propsOut.status === 'fulfilled' && propsOut.value.properties) {
            propsOut.value.properties.forEach((p: any) => {
                results.push({
                    id: p.id,
                    title: p.title,
                    subtitle: `${p.city} • ₹${(p.price / 100000).toFixed(1)}L`,
                    type: 'property',
                    url: `/admin/properties/${p.id}`
                });
            });
        }

        // Process Transactions
        if (txnsOut.status === 'fulfilled' && txnsOut.value.transactions) {
            txnsOut.value.transactions.forEach((t: any) => {
                results.push({
                    id: t.id,
                    title: `Transaction #${t.id.slice(0, 8)}`,
                    subtitle: `${t.property.title} • ${t.status}`,
                    type: 'transaction',
                    url: `/admin/transactions/${t.id}`
                });
            });
        }

        return results;

    } catch (error) {
        console.error("Search failed:", error);
        return results; // Return whatever partial results we have
    }
}
