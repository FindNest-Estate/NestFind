/**
 * Agent API Client
 * 
 * Functions for agent operations (requires AGENT role)
 */

import { get, post } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface PropertySummary {
    id: string;
    title: string | null;
    type: string | null;
    price: number | null;
    city: string | null;
    status: string;
    thumbnail_url: string | null;
}

export interface SellerSummary {
    name: string;
    email: string;
}

export interface AssignmentListItem {
    id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
    property: PropertySummary;
    seller: SellerSummary;
}

export interface Pagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
}

export interface AssignmentListResponse {
    assignments: AssignmentListItem[];
    pagination: Pagination;
}

export interface PropertyMedia {
    id: string;
    file_url: string;
    is_primary: boolean;
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
    status: string;
    media: PropertyMedia[];
}

export interface SellerDetail {
    id: string;
    name: string;
    email: string;
    phone: string | null;
}

export interface AssignmentDetail {
    id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
    decline_reason: string | null;
    property: PropertyDetail;
    seller: SellerDetail;
}

export interface ActionResponse {
    success: boolean;
    new_status?: string;
    property_status?: string;
}

export interface AnalyticsResponse {
    success: boolean;
    overview: {
        completed_deals: number;
        active_deals: number;
        pending_requests: number;
        total_earnings: number;
        conversion_rate: number;
        avg_deal_size: number;
    };
    chart_data: Array<{
        name: string;
        earnings: number;
        deals: number;
        visits?: number;
    }>;
    portfolio_data?: Array<{
        name: string;
        value: number;
    }>;
}


export interface CRMLead {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    type: 'SELLER' | 'BUYER';
    stage: string;
    interest: string;
    last_contact: string;
}

export interface CRMLeadsResponse {
    success: boolean;
    leads: CRMLead[];
}

export interface AgentInsight {
    id: string;
    type: 'opportunity' | 'warning' | 'info';
    title: string;
    description: string;
    action: string;
}

export interface InsightsResponse {
    success: boolean;
    insights: AgentInsight[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get list of agent's assignments.
 * Requires AGENT role.
 */
export async function getAgentAssignments(
    status?: 'pending' | 'active' | 'completed',
    page: number = 1,
    perPage: number = 20
): Promise<AssignmentListResponse> {
    let url = `/agent/assignments?page=${page}&per_page=${perPage}`;
    if (status) url += `&status=${status}`;
    return get<AssignmentListResponse>(url);
}

/**
 * Get assignment detail.
 * Requires AGENT role.
 */
export async function getAssignmentDetail(
    assignmentId: string
): Promise<AssignmentDetail> {
    return get<AssignmentDetail>(`/agent/assignments/${assignmentId}`);
}

/**
 * Accept an assignment.
 * Requires AGENT role.
 */
export async function acceptAssignment(
    assignmentId: string
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/accept`, {});
}

/**
 * Decline an assignment.
 * Requires AGENT role.
 */
export async function declineAssignment(
    assignmentId: string,
    reason?: string
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/decline`, { reason });
}

/**
 * Start property verification.
 * Requires AGENT role.
 */
export async function startVerification(
    assignmentId: string
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/start-verification`, {});
}

/**
 * Complete property verification.
 * Requires AGENT role.
 */
export async function completeVerification(
    assignmentId: string,
    data: {
        approved: boolean;
        gps_lat?: number;
        gps_lng?: number;
        notes?: string;
        rejection_reason?: string;
        checklist?: Record<string, boolean>;
    }
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/complete-verification`, data);
}

/**
 * Generate verification OTP for seller.
 */
export async function generateOtp(
    assignmentId: string
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/verification/generate-otp`, {});
}

/**
 * Verify seller's OTP.
 */
export async function verifyOtp(
    assignmentId: string,
    otpCode: string
): Promise<ActionResponse> {
    return post<ActionResponse>(`/agent/assignments/${assignmentId}/verification/verify-otp`, { otp_code: otpCode });
}

/**
 * Seller requests an agent for property.
 * Returns assignment info.
 */
export async function hireAgent(
    propertyId: string
): Promise<{ success: boolean; assignment_id: string; agent_name: string; new_status: string }> {
    return post(`/properties/${propertyId}/hire-agent`, {});
}

/**
 * Get agent analytics.
 */
export async function getAgentAnalytics(period: string = 'month'): Promise<AnalyticsResponse> {
    return get<AnalyticsResponse>(`/agent/stats/analytics?period=${period}`);
}

/**
 * Get CRM leads.
 */
export async function getAgentCRMLeads(): Promise<CRMLeadsResponse> {
    return get<CRMLeadsResponse>('/agent/crm/leads');
}

/**
 * Get agent insights.
 */
export async function getAgentInsights(): Promise<InsightsResponse> {
    return get<InsightsResponse>('/agent/insights');
}

export interface ScheduleEvent {
    id: string;
    title: string;
    start: string;
    allDay: boolean;
    type: 'verification' | 'visit' | 'task';
    color: string;
    status?: string;
}

export interface ScheduleResponse {
    success: boolean;
    events: ScheduleEvent[];
}

export interface MarketingTemplate {
    id: string;
    name: string;
    type: string;
    thumbnail: string;
}

export interface MarketingTemplatesResponse {
    success: boolean;
    templates: MarketingTemplate[];
}

export interface MarketingAssetResponse {
    success: boolean;
    asset_url: string;
    type: string;
}

export interface MarketingHistoryItem {
    id: string;
    property_title: string;
    template_name: string;
    generated_at: string;
    url: string;
}

export interface MarketingHistoryResponse {
    success: boolean;
    history: MarketingHistoryItem[];
}

export interface ManageEventResponse {
    success: boolean;
    event?: ScheduleEvent;
}

/**
 * Get agent schedule.
 */
export async function getAgentSchedule(start: string, end: string): Promise<ScheduleResponse> {
    return get<ScheduleResponse>(`/agent/schedule/events?start=${start}&end=${end}`);
}

/**
 * Create schedule event.
 */
export async function createScheduleEvent(title: string, start: string, type: string): Promise<ManageEventResponse> {
    return post<ManageEventResponse>('/agent/schedule/events', { title, start, type });
}

/**
 * Delete schedule event.
 */
export async function deleteScheduleEvent(eventId: string): Promise<ActionResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agent/schedule/events/${eventId}`, {
        method: 'DELETE', // DELETE is not in the wrapper yet, defaulting to manual fetch or would need to add to api wrapper
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

/**
 * Get marketing templates.
 */
export async function getMarketingTemplates(): Promise<MarketingTemplatesResponse> {
    return get<MarketingTemplatesResponse>('/agent/marketing/templates');
}

/**
 * Get marketing history.
 */
export async function getMarketingHistory(): Promise<MarketingHistoryResponse> {
    return get<MarketingHistoryResponse>('/agent/marketing/history');
}

/**
 * Generate marketing asset.
 */
export async function generateMarketingAsset(
    propertyId: string,
    templateId: string,
    customOptions?: { accentColor?: string; headline?: string; footer?: string; }
): Promise<MarketingAssetResponse> {
    return post<MarketingAssetResponse>('/agent/marketing/generate', {
        property_id: propertyId,
        template_id: templateId,
        custom_options: customOptions
    });
}

export interface VisitActionResponse {
    success: boolean;
    new_status: string;
}

export interface AgentOffer {
    id: string;
    property_id: string;
    property_title: string;
    property_thumbnail: string;
    buyer_name: string;
    offer_amount: number;
    asking_price: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
    counter_amount?: number;
    submitted_at: string;
}

export interface AgentOffersResponse {
    success: boolean;
    offers: AgentOffer[];
}

/**
 * Handle visit action (approve, reject, check-in, complete)
 */
export async function manageVisitAction(visitId: string, action: string, notes?: string): Promise<VisitActionResponse> {
    return post<VisitActionResponse>(`/agent/visits/${visitId}/action`, { action, notes });
}

/**
 * Get active offers
 */
export async function getAgentOffers(): Promise<AgentOffersResponse> {
    return get<AgentOffersResponse>('/agent/offers');
}

/**
 * Handle offer action (accept, reject, counter)
 */
export async function manageOfferAction(offerId: string, action: string, amount?: number): Promise<VisitActionResponse> { // Using same response shape
    return post<VisitActionResponse>(`/agent/offers/${offerId}/action`, { action, amount });
}

// ============================================================================
// MESSAGES API
// ============================================================================

export interface ConversationMessage {
    id: string;
    sender_id: string;
    content: string;
    message_type: string;
    sent_at: string;
    read: boolean;
}

export interface Conversation {
    id: string;
    contact_name: string;
    contact_email: string;
    contact_type: 'SELLER' | 'BUYER';
    property_title: string;
    property_id: string | null;
    last_message: string;
    last_message_time: string;
    unread_count: number;
    messages: ConversationMessage[];
}

export interface MessagesResponse {
    success: boolean;
    conversations: Conversation[];
}

export interface MessageSendResponse {
    success: boolean;
    message: ConversationMessage;
}

/**
 * Get agent messages/conversations from database
 */
export async function getAgentMessages(): Promise<MessagesResponse> {
    return get<MessagesResponse>('/agent/messages');
}

/**
 * Send a message
 */
export async function sendAgentMessage(
    conversationId: string,
    content: string,
    messageType: string = 'text'
): Promise<MessageSendResponse> {
    return post<MessageSendResponse>('/agent/messages/send', {
        conversation_id: conversationId,
        content,
        message_type: messageType
    });
}

// ============================================================================
// DOCUMENTS API
// ============================================================================

export interface AgentDocument {
    id: string;
    name: string;
    file_url: string;
    category: string;
    type: string;
    property_id: string | null;
    property_title: string | null;
    created_at: string | null;
    status: string;
}

export interface DocumentsResponse {
    success: boolean;
    documents: AgentDocument[];
    stats: {
        total: number;
        by_category: Record<string, number>;
    };
}

export interface DocumentUploadResponse {
    success: boolean;
    document: AgentDocument;
}

/**
 * Get agent documents from database
 */
export async function getAgentDocuments(category?: string): Promise<DocumentsResponse> {
    const url = category ? `/agent/documents?category=${category}` : '/agent/documents';
    return get<DocumentsResponse>(url);
}

/**
 * Upload a document
 */
export async function uploadAgentDocument(
    name: string,
    category: string,
    fileUrl: string,
    propertyId?: string
): Promise<DocumentUploadResponse> {
    return post<DocumentUploadResponse>('/agent/documents', {
        name,
        category,
        file_url: fileUrl,
        property_id: propertyId
    });
}

/**
 * Delete a document
 */
export async function deleteAgentDocument(documentId: string): Promise<ActionResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agent/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

