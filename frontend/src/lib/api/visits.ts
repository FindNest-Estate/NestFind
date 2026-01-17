import { post, get } from '@/lib/api';
import { Visit } from '@/lib/types/visit';

export interface VisitRequestData {
    property_id: string;
    preferred_date: string; // ISO string
    buyer_message?: string;
}


export interface VisitResponse {
    success: boolean;
    visit?: Visit;  // Backend returns 'visit' not 'data'
    visit_id?: string; // For create response
    message?: string;
    error?: string;
}

export interface VisitListResponse {
    success: boolean;
    visits: Visit[];  // Backend returns 'visits' not 'data.items'
    pagination?: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
    error?: string;
}


export const visitsApi = {
    // Request a new visit
    requestVisit: async (data: VisitRequestData): Promise<VisitResponse> => {
        try {
            return await post<VisitResponse>('/visits', data);
        } catch (error: any) {
            console.error('Request visit error:', error);
            return {
                success: false,
                error: error.data?.detail || error.message || 'Failed to request visit'
            };
        }
    },

    // Get visits list
    getVisits: async (status?: string, page: number = 1): Promise<VisitListResponse> => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                per_page: '20'
            });

            if (status) {
                queryParams.append('status', status);
            }

            return await get<VisitListResponse>(`/visits?${queryParams.toString()}`);
        } catch (error: any) {
            console.error('Get visits error:', error);
            return {
                success: false,
                visits: [],
                pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
                error: error.data?.detail || error.message || 'Failed to fetch visits'
            };
        }
    },

    // Get single visit details
    getVisit: async (id: string): Promise<VisitResponse> => {
        try {
            return await get<VisitResponse>(`/visits/${id}`);
        } catch (error: any) {
            console.error('Get visit details error:', error);
            return {
                success: false,
                error: error.data?.detail || error.message || 'Failed to fetch visit details'
            };
        }
    },

    // Cancel a visit (Buyer or Agent)
    cancelVisit: async (id: string, reason?: string): Promise<VisitResponse> => {
        try {
            return await post<VisitResponse>(`/visits/${id}/cancel`, { reason });
        } catch (error: any) {
            console.error('Cancel visit error:', error);
            return {
                success: false,
                error: error.data?.detail || error.message || 'Failed to cancel visit'
            };
        }
    },

    // Counter a visit (Agent or Buyer)
    counterVisit: async (id: string, newDate: string, message?: string): Promise<VisitResponse> => {
        try {
            return await post<VisitResponse>(`/visits/${id}/counter`, {
                new_date: newDate,
                message
            });
        } catch (error: any) {
            console.error('Counter visit error:', error);
            return {
                success: false,
                error: error.data?.detail || error.message || 'Failed to counter visit'
            };
        }
    },

    // Respond to counter (Accept/Reject)
    respondToCounter: async (id: string, accept: boolean): Promise<VisitResponse> => {
        try {
            return await post<VisitResponse>(`/visits/${id}/respond`, { accept });
        } catch (error: any) {
            console.error('Respond to counter error:', error);
            return {
                success: false,
                error: error.data?.detail || error.message || 'Failed to respond to counter'
            };
        }
    }
};

// Named exports for pages that import directly
// These wrap the visitsApi methods for convenient imports

export async function getVisits(status?: string, page: number = 1) {
    return visitsApi.getVisits(status, page);
}

export async function getVisitById(id: string): Promise<VisitResponse> {
    return visitsApi.getVisit(id);
}

export async function cancelVisit(id: string, reason?: string): Promise<VisitResponse> {
    return visitsApi.cancelVisit(id, reason);
}

export async function approveVisit(id: string, confirmedDate?: string): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/approve`, {
            confirmed_date: confirmedDate
        });
    } catch (error: any) {
        console.error('Approve visit error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to approve visit'
        };
    }
}

export async function rejectVisit(id: string, reason?: string): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/reject`, { reason });
    } catch (error: any) {
        console.error('Reject visit error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to reject visit'
        };
    }
}

export async function checkInVisit(id: string, gpsLat: number, gpsLng: number): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/check-in`, {
            gps_lat: gpsLat,
            gps_lng: gpsLng
        });
    } catch (error: any) {
        console.error('Check-in visit error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to check in'
        };
    }
}

export async function completeVisit(id: string, agentNotes?: string): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/complete`, {
            agent_notes: agentNotes
        });
    } catch (error: any) {
        console.error('Complete visit error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to complete visit'
        };
    }
}

export async function markNoShow(id: string): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/no-show`);
    } catch (error: any) {
        console.error('Mark no-show error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to mark no-show'
        };
    }
}


export async function counterVisit(id: string, newDate: string, message?: string): Promise<VisitResponse> {
    return visitsApi.counterVisit(id, newDate, message);
}

export async function respondToCounter(id: string, accept: boolean): Promise<VisitResponse> {
    return visitsApi.respondToCounter(id, accept);
}

// ============================================================================
// ENHANCED VISIT VERIFICATION APIs
// ============================================================================

import { VisitOTPResponse, AgentFeedbackData, BuyerFeedbackData, VisitFeedbackResponse, VisitImage } from '@/lib/types/visit';

export async function startVisitSession(id: string, gpsLat: number, gpsLng: number): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/start-session`, {
            gps_lat: gpsLat,
            gps_lng: gpsLng
        });
    } catch (error: any) {
        console.error('Start visit session error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to start visit session'
        };
    }
}

export async function getBuyerOTP(id: string): Promise<VisitOTPResponse> {
    try {
        return await get<VisitOTPResponse>(`/visits/${id}/otp`);
    } catch (error: any) {
        console.error('Get buyer OTP error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to get OTP'
        };
    }
}

export async function submitAgentFeedback(id: string, feedback: AgentFeedbackData): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/feedback/agent`, feedback);
    } catch (error: any) {
        console.error('Submit agent feedback error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to submit feedback'
        };
    }
}

export async function submitBuyerFeedback(id: string, feedback: BuyerFeedbackData): Promise<VisitResponse> {
    try {
        return await post<VisitResponse>(`/visits/${id}/feedback/buyer`, feedback);
    } catch (error: any) {
        console.error('Submit buyer feedback error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to submit feedback'
        };
    }
}

export async function getVisitFeedback(id: string): Promise<VisitFeedbackResponse> {
    try {
        return await get<VisitFeedbackResponse>(`/visits/${id}/feedback`);
    } catch (error: any) {
        console.error('Get visit feedback error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to get feedback'
        };
    }
}

interface VisitImagesResponse {
    success: boolean;
    images?: VisitImage[];
    total?: number;
    error?: string;
}

export async function getVisitImages(id: string): Promise<VisitImagesResponse> {
    try {
        return await get<VisitImagesResponse>(`/visits/${id}/images`);
    } catch (error: any) {
        console.error('Get visit images error:', error);
        return {
            success: false,
            images: [],
            error: error.data?.detail || error.message || 'Failed to get images'
        };
    }
}

export async function uploadVisitImage(
    id: string,
    file: File,
    imageType?: string,
    caption?: string
): Promise<{ success: boolean; image?: VisitImage; error?: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        if (imageType) formData.append('image_type', imageType);
        if (caption) formData.append('caption', caption);

        return await post(`/visits/${id}/images`, formData);
    } catch (error: any) {
        console.error('Upload visit image error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to upload image'
        };
    }
}

export async function deleteVisitImage(visitId: string, imageId: string): Promise<VisitResponse> {
    try {
        // Using fetch directly for DELETE method
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/visits/${visitId}/images/${imageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return await response.json();
    } catch (error: any) {
        console.error('Delete visit image error:', error);
        return {
            success: false,
            error: error.data?.detail || error.message || 'Failed to delete image'
        };
    }
}
