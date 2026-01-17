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
