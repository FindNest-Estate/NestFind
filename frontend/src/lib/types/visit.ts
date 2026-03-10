export enum VisitStatus {
    REQUESTED = 'REQUESTED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CHECKED_IN = 'CHECKED_IN',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
    COUNTERED = 'COUNTERED'
}

export interface VisitVerification {
    id: string;
    visit_id: string;
    agent_id: string;
    gps_lat: number;
    gps_lng: number;
    verified_at: string;
    otp_verified_at?: string;
}

export interface Visit {
    id: string;
    property_id: string;
    buyer_id: string;
    agent_id: string;
    status: VisitStatus;
    preferred_date: string;
    confirmed_date?: string;
    buyer_message?: string;
    agent_notes?: string;
    rejection_reason?: string;
    cancel_reason?: string;
    counter_date?: string;
    counter_message?: string;
    counter_by?: string;
    created_at: string;
    updated_at: string;

    // Joined data
    property?: {
        title: string;
        address: string;
        thumbnail_url?: string;
        latitude?: number;
        longitude?: number;
    };
    agent?: {
        full_name: string;
        phone_number?: string;
    };
    buyer?: {
        full_name: string;
        email: string;
        phone_number?: string;
    };
    verification?: VisitVerification;

    // UI Helpers
    allowed_actions?: string[];
}

export interface CreateVisitRequest {
    property_id: string;
    preferred_date: string; // ISO string
    buyer_message?: string;
}

export interface VisitListResponse {
    visits: Visit[];
    total: number;
    page: number;
    per_page: number;
}

// OTP Types
export interface VisitOTP {
    code: string;
    expires_at: string;
    property_title: string;
}

export interface VisitOTPResponse {
    success: boolean;
    otp?: VisitOTP;
    error?: string;
}

// Agent Feedback Types
export interface AgentFeedbackData {
    buyer_interest_level?: number;  // 1-5
    buyer_perceived_budget?: 'LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM';
    property_condition_notes?: string;
    buyer_questions?: string;
    follow_up_required?: boolean;
    recommended_action?: 'PROCEED' | 'NEGOTIATE' | 'PASS' | 'UNDECIDED';
    additional_notes?: string;
}

export interface AgentFeedback extends AgentFeedbackData {
    id: string;
    created_at: string;
}

// Buyer Feedback Types
export interface BuyerFeedbackData {
    overall_rating?: number;  // 1-5
    agent_professionalism?: number;  // 1-5
    property_condition_rating?: number;  // 1-5
    property_as_described?: boolean;
    interest_level?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_INTERESTED';
    liked_aspects?: string;
    concerns?: string;
    would_recommend?: boolean;
}

export interface BuyerFeedback extends BuyerFeedbackData {
    id: string;
    created_at: string;
}

// Visit Image Types
export interface VisitImage {
    id: string;
    uploader_role: 'AGENT' | 'BUYER';
    image_type?: 'PROPERTY' | 'MEETING' | 'DOCUMENT' | 'OTHER';
    file_url: string;
    file_name?: string;
    file_size?: number;
    caption?: string;
    created_at: string;
}

export interface VisitFeedbackResponse {
    success: boolean;
    agent_feedback?: AgentFeedback;
    buyer_feedback?: BuyerFeedback;
    error?: string;
}

// ============================================================================
// FOLLOW-UP TYPES
// ============================================================================

export interface FollowupContext {
    visit: {
        id: string;
        status: VisitStatus;
        visit_date?: string;
        property: {
            id: string;
            title: string;
            price?: number;
            city: string;
        };
        buyer: {
            id: string;
            name: string;
            email?: string;
            phone?: string;
        };
        agent: {
            id: string;
            name: string;
            phone?: string;
        };
    };
    verification?: {
        gps_verified: boolean;
        otp_verified: boolean;
        duration_minutes?: number;
    };
    agent_feedback?: {
        interest_level?: number;
        budget?: string;
        recommended_action?: string;
        follow_up_required?: boolean;
        notes?: string;
    };
    buyer_feedback?: {
        overall_rating?: number;
        interest_level?: string;
        concerns?: string;
        liked_aspects?: string;
        would_recommend?: boolean;
    };
    offer?: {
        id: string;
        amount: number;
        status: string;
        created_at: string;
    };
    suggested_actions: string[];
}

export interface FollowupContextResponse {
    success: boolean;
    context?: FollowupContext;
    error?: string;
}

export interface FlaggedVisit {
    visit_id: string;
    property_title: string;
    property_city: string;
    buyer_name: string;
    interest_level?: number;
    budget?: string;
    recommended_action?: string;
    feedback_at?: string;
    visit_date?: string;
}

export interface PendingFeedbackVisit {
    visit_id: string;
    property_title: string;
    buyer_name: string;
    completed_at?: string;
    visit_date?: string;
}

export interface HotLeadVisit {
    visit_id: string;
    property_id: string;
    property_title: string;
    property_price?: number;
    buyer_name: string;
    agent_interest_score?: number;
    agent_action?: string;
    buyer_interest?: string;
    visit_date?: string;
}

export interface FollowupDashboardResponse {
    success: boolean;
    follow_up_required?: FlaggedVisit[];
    pending_feedback?: PendingFeedbackVisit[];
    hot_leads?: HotLeadVisit[];
    summary?: {
        follow_up_count: number;
        pending_feedback_count: number;
        hot_leads_count: number;
    };
    error?: string;
}
