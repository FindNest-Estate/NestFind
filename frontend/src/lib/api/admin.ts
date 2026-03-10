/**
 * Admin API Client
 * 
 * Complete typed functions for all admin operations (requires ADMIN role).
 * Mirrors backend routers: admin_analytics, admin_agent_approval, admin_audit_logs,
 * admin_properties, admin_users, admin_transactions, admin_operations.
 */

import { get, post } from '@/lib/api';
import queryString from 'query-string';

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
}

// ============================================================================
// AGENT APPROVAL
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
    coordinates: { lat: number; lng: number } | null;
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

export async function getAgentDetails(agentId: string): Promise<AgentDetailResponse> {
    return get<AgentDetailResponse>(`/admin/agents/${agentId}`);
}

export async function getAgentCoverage(lat: number, lng: number, radius: number): Promise<any> {
    return get<any>(`/admin/agents/coverage/check?lat=${lat}&lng=${lng}&radius=${radius}`);
}

export async function getPendingAgents(page = 1, perPage = 20): Promise<PendingAgentsResponse> {
    return get<PendingAgentsResponse>(`/admin/agents/pending?page=${page}&per_page=${perPage}`);
}

export async function approveAgent(agentId: string, reason?: string): Promise<AgentDecisionResponse> {
    return post<AgentDecisionResponse>(`/admin/agents/${agentId}/approve`, { decision_reason: reason });
}

export async function declineAgent(agentId: string, reason?: string): Promise<AgentDecisionResponse> {
    return post<AgentDecisionResponse>(`/admin/agents/${agentId}/decline`, { decision_reason: reason });
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

export interface RevenueTrend {
    date: string;
    revenue: number;
    deals: number;
}

export async function getPlatformOverview(): Promise<{ success: boolean; data: PlatformOverview }> {
    return get<{ success: boolean; data: PlatformOverview }>('/admin/analytics/overview');
}

export async function getRevenueTrends(days = 30): Promise<{ success: boolean; data: RevenueTrend[] }> {
    return get<{ success: boolean; data: RevenueTrend[] }>(`/admin/analytics/revenue-trends?days=${days}`);
}

export async function getUserGrowth(days = 30): Promise<{ success: boolean; data: any }> {
    return get<{ success: boolean; data: any }>(`/admin/analytics/user-growth?days=${days}`);
}

// ============================================================================
// PROPERTIES
// ============================================================================

export interface AdminProperty {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    price: number;
    property_type: string;
    status: string;
    created_at: string;
    verified_at: string | null;
    seller_name: string;
    agent_name: string | null;
    thumbnail_url: string | null;
    visit_count: number;
    offer_count: number;
    bedrooms?: number;
    bathrooms?: number;
    area_sqft?: number;
}

export interface AdminPropertyStats {
    total: number;
    active: number;
    pending: number;
    sold: number;
}

export interface AdminPropertiesResponse {
    success: boolean;
    properties: AdminProperty[];
    stats: AdminPropertyStats;
    pagination: Pagination;
}

export interface AdminPropertyDetail {
    id: string;
    title: string;
    description: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    price: number;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    area_sqft: number;
    status: string;
    created_at: string;
    verified_at: string | null;
    seller: { id: string; name: string; email: string };
    agent: { id: string; name: string; email: string } | null;
    visits: number;
    offers: number;
    transactions: number;
    media: Array<{ id: string; url: string; type: string; is_primary: boolean }>;
}

export interface AdminPropertyFilters {
    search?: string;
    status?: string;
    city?: string;
    page?: number;
    per_page?: number;
}

export async function getAdminProperties(params: AdminPropertyFilters = {}): Promise<AdminPropertiesResponse> {
    const qs = queryString.stringify(params, { skipNull: true, skipEmptyString: true });
    return get<AdminPropertiesResponse>(`/admin/properties?${qs}`);
}

export async function getAdminPropertyDetail(propertyId: string): Promise<{ success: boolean; property: AdminPropertyDetail }> {
    return get<{ success: boolean; property: AdminPropertyDetail }>(`/admin/properties/${propertyId}`);
}

export async function overridePropertyStatus(propertyId: string, status: string, reason?: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/properties/${propertyId}/status`, { status, reason });
}

// ============================================================================
// USERS
// ============================================================================

export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    property_count: number;
    purchase_count: number;
}

export interface AdminUserStats {
    active: number;
    suspended: number;
    users: number;
    agents: number;
    admins: number;
}

export interface AdminUsersResponse {
    success: boolean;
    users: AdminUser[];
    stats: AdminUserStats;
    pagination: Pagination;
}

export interface AdminUserDetail {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    property_count: number;
    purchase_count: number;
    visit_count: number;
    properties?: Array<{ id: string; title: string; status: string; price: number; city: string; created_at: string }>;
    transactions?: Array<{ id: string; property_title: string; total_price: number; status: string; created_at: string }>;
}

export interface AdminUserFilters {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    per_page?: number;
}

export async function getAdminUsers(params: AdminUserFilters = {}): Promise<AdminUsersResponse> {
    const qs = queryString.stringify(params, { skipNull: true, skipEmptyString: true });
    return get<AdminUsersResponse>(`/admin/users?${qs}`);
}

export async function getAdminUserDetail(userId: string): Promise<{ success: boolean; user: AdminUserDetail }> {
    return get<{ success: boolean; user: AdminUserDetail }>(`/admin/users/${userId}`);
}

export async function suspendUser(userId: string, reason?: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/users/${userId}/suspend`, { reason });
}

export async function activateUser(userId: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/users/${userId}/activate`, {});
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface AdminTransaction {
    id: string;
    property_id: string;
    property_title: string;
    property_city: string;
    buyer_name: string;
    seller_name: string;
    agent_name: string;
    total_price: number;
    agent_commission: number;
    status: string;
    display_status: string;
    created_at: string;
}

export interface AdminTransactionsResponse {
    success: boolean;
    transactions: AdminTransaction[];
    pagination: { page: number; per_page: number; total: number };
}

export interface AdminTransactionDetail {
    id: string;
    property: { id: string; title: string; city: string; address: string };
    buyer: { id: string; name: string };
    seller: { id: string; name: string };
    agent: { id: string; name: string };
    total_price: number;
    commission: { total: number; agent_share: number; platform_share: number };
    status: string;
    display_status: string;
    created_at?: string;
    documents: AdminTransactionDocument[];
}

export interface AdminTransactionDocument {
    id: string;
    uploader_name: string;
    uploader_role: string;
    document_type: string;
    file_url: string;
    file_name: string;
    admin_verified: boolean;
    admin_notes: string | null;
    uploaded_at: string;
}

export async function getAdminTransactions(params: { status?: string; page?: number; per_page?: number } = {}): Promise<AdminTransactionsResponse> {
    const qs = queryString.stringify(params, { skipNull: true, skipEmptyString: true });
    return get<AdminTransactionsResponse>(`/admin/transactions?${qs}`);
}

export async function getAdminTransactionDetail(transactionId: string): Promise<{ success: boolean; transaction: AdminTransactionDetail }> {
    return get<{ success: boolean; transaction: AdminTransactionDetail }>(`/admin/transactions/${transactionId}`);
}

export async function verifyDocument(docId: string, approved: boolean, notes?: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/documents/${docId}/verify`, { approved, notes });
}

export async function approveTransaction(transactionId: string, notes?: string): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`/admin/transactions/${transactionId}/approve`, { notes });
}

// ============================================================================
// OPERATIONS (mirrors admin_operations.py)
// ============================================================================

export interface DealPipelineItem {
    status: string;
    count: number;
    avg_age_days: number;
}

export interface StuckDeal {
    deal_id: string;
    property_title: string;
    status: string;
    days_stuck: number;
    buyer_name: string;
    seller_name: string;
    agent_name: string;
}

export interface DisputedDeal {
    deal_id: string;
    property_title: string;
    dispute_category: string;
    dispute_amount: number;
    age_days: number;
    buyer_name: string;
    seller_name: string;
}

export interface AgentMetric {
    agent_id: string;
    agent_name: string;
    deals_assigned: number;
    deals_completed: number;
    dispute_rate: number;
    commission_earned: number;
}

export interface FinancialSummary {
    total_gmv: number;
    platform_fees: number;
    commission_released: number;
    commission_pending: number;
    token_money_frozen: number;
}

export interface DisputeAgingBucket {
    status: string;
    under_7_days: number;
    days_7_14: number;
    days_14_30: number;
    over_30_days: number;
}

export interface CancellationItem {
    state: string;
    count: number;
    reasons: string[];
}

export interface AdminActionItem {
    id: string;
    admin_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    timestamp: string;
}

export async function getDealPipeline(): Promise<{ success: boolean; data: DealPipelineItem[] }> {
    return get<{ success: boolean; data: DealPipelineItem[] }>('/admin/operations/deal-pipeline');
}

export async function getStuckDeals(thresholdDays = 7): Promise<{ success: boolean; data: StuckDeal[] }> {
    return get<{ success: boolean; data: StuckDeal[] }>(`/admin/operations/stuck-deals?threshold_days=${thresholdDays}`);
}

export async function getDisputedDeals(): Promise<{ success: boolean; data: DisputedDeal[] }> {
    return get<{ success: boolean; data: DisputedDeal[] }>('/admin/operations/disputed-deals');
}

export async function getDealsAwaitingAgreements(): Promise<{ success: boolean; data: any[] }> {
    return get<{ success: boolean; data: any[] }>('/admin/operations/deals-awaiting-agreements');
}

export async function getAgentMetrics(agentId?: string): Promise<{ success: boolean; data: AgentMetric[] }> {
    const qs = agentId ? `?agent_id=${agentId}` : '';
    return get<{ success: boolean; data: AgentMetric[] }>(`/admin/operations/agent-metrics${qs}`);
}

export async function getFinancialSummary(): Promise<{ success: boolean; data: FinancialSummary }> {
    return get<{ success: boolean; data: FinancialSummary }>('/admin/operations/financial-summary');
}

export async function getAgreementCompliance(): Promise<{ success: boolean; data: any[] }> {
    return get<{ success: boolean; data: any[] }>('/admin/operations/agreement-compliance');
}

export async function getDisputeAging(): Promise<{ success: boolean; data: DisputeAgingBucket[] }> {
    return get<{ success: boolean; data: DisputeAgingBucket[] }>('/admin/operations/dispute-aging');
}

export async function getCancellationReport(): Promise<{ success: boolean; data: CancellationItem[] }> {
    return get<{ success: boolean; data: CancellationItem[] }>('/admin/operations/cancellation-report');
}

export async function getAdminActionLog(limit = 50): Promise<{ success: boolean; data: AdminActionItem[] }> {
    return get<{ success: boolean; data: AdminActionItem[] }>(`/admin/operations/admin-action-log?limit=${limit}`);
}

export async function exportReport(reportType: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/operations/export/${reportType}?format=${format}`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
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
// GLOBAL SEARCH
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
        if (usersOut.status === 'fulfilled' && usersOut.value.users) {
            usersOut.value.users.forEach((u: any) => {
                results.push({
                    id: u.id, title: u.full_name,
                    subtitle: `${u.role.toUpperCase()} • ${u.email}`,
                    type: u.role === 'agent' ? 'agent' : 'user',
                    url: u.role === 'agent' ? `/admin/agents/${u.id}` : `/admin/users/${u.id}`
                });
            });
        }
        if (propsOut.status === 'fulfilled' && propsOut.value.properties) {
            propsOut.value.properties.forEach((p: any) => {
                results.push({
                    id: p.id, title: p.title,
                    subtitle: `${p.city} • ₹${(p.price / 100000).toFixed(1)}L`,
                    type: 'property', url: `/admin/properties/${p.id}`
                });
            });
        }
        if (txnsOut.status === 'fulfilled' && txnsOut.value.transactions) {
            txnsOut.value.transactions.forEach((t: any) => {
                results.push({
                    id: t.id, title: `Transaction #${t.id.slice(0, 8)}`,
                    subtitle: `${t.property_title} • ${t.status}`,
                    type: 'transaction', url: `/admin/transactions/${t.id}`
                });
            });
        }
        return results;
    } catch (error) {
        console.error("Search failed:", error);
        return results;
    }
}
