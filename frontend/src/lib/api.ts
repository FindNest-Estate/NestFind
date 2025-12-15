import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API_URL:', API_URL);

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    } as HeadersInit;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
            let errorMessage = error.detail || 'Request failed';
            if (typeof errorMessage !== 'string') {
                errorMessage = JSON.stringify(errorMessage);
            }
            // Show toast for error
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error: any) {
        // If it's a network error (fetch failed completely)
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            toast.error('Network error. Please check your connection.');
        }

        // Handle 401 Unauthorized globally
        if (error.message.includes('Not authenticated') || error.message.includes('Could not validate credentials')) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }

        throw error;
    }
}





export const api = {
    API_URL,
    auth: {
        login: (data: any) => fetchAPI('/auth/login', {
            method: 'POST',
            body: new URLSearchParams(data), // OAuth2PasswordRequestForm expects form data
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }),
        me: () => fetchAPI('/auth/me'),
        register: (data: any) => fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        changePassword: (data: any) => fetchAPI('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
    },
    dashboard: {
        agentStats: () => fetchAPI('/dashboard/agent/stats'),
        buyerStats: () => fetchAPI('/dashboard/buyer/stats'),
        agentFinance: () => fetchAPI('/dashboard/agent/finance'),
        agentAnalytics: (timeRange = '7d') => fetchAPI(`/dashboard/agent/analytics?time_range=${timeRange}`),
    },
    transactions: {
        payToken: (data: { offer_id: number, amount: number }) => fetchAPI('/transactions/pay-token', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        finalize: (data: { offer_id: number, amount: number }) => fetchAPI('/transactions/finalize', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        })
    },
    properties: {
        list: (params?: { user_id?: number }) => {
            const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
            return fetchAPI(`/properties/${queryString}`);
        },
        get: (id: number) => fetchAPI(`/properties/${id}`),
        create: (data: any) => fetchAPI('/properties/', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        uploadImage: (id: number, file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${API_URL}/properties/${id}/images`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                }
            }).then(res => res.json());
        },
        deleteImage: (propertyId: number, imageId: number) => fetchAPI(`/properties/${propertyId}/images/${imageId}`, {
            method: 'DELETE',
        }),
        delete: (id: number) => fetchAPI(`/properties/${id}`, {
            method: 'DELETE',
        }),
        update: (id: number, data: any) => fetchAPI(`/properties/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
    },
    bookings: {
        create: (data: any) => fetchAPI('/bookings/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        list: () => fetchAPI('/bookings/'),
        updateStatus: (id: number, data: { action: string, slot?: string, reason?: string, notes?: string, expected_version?: number }) => fetchAPI(`/bookings/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        getHistory: (id: number) => fetchAPI(`/bookings/${id}/activity-log`),
        myVisits: () => fetchAPI('/bookings/my-visits'),
        agentSchedule: () => fetchAPI('/bookings/agent-schedule'),
        createReview: (bookingId: number, data: { rating: number, comment?: string, visit_outcome?: string }) => fetchAPI(`/bookings/${bookingId}/review`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        generateOTP: (id: number) => fetchAPI(`/bookings/${id}/otp/generate`, { method: 'POST' }),
        startVisit: (id: number, otp?: string) => fetchAPI(`/bookings/${id}/start${otp ? `?otp=${otp}` : ''}`, { method: 'POST' }),
        completeVisit: (id: number, data: any) => fetchAPI(`/bookings/${id}/complete`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        uploadImage: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${API_URL}/bookings/upload-image`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                }
            }).then(res => res.json());
        },
    },
    offers: {
        create: (data: any) => fetchAPI('/offers/', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        get: (id: number) => fetchAPI(`/offers/${id}`),
        list: () => fetchAPI('/offers/'),
        update: (id: number, data: { status: string, amount?: number }) => fetchAPI(`/offers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        scheduleRegistration: (id: number, date: string) => fetchAPI(`/offers/${id}/schedule-registration`, {
            method: 'PUT',
            body: JSON.stringify({ registration_date: date }),
            headers: { 'Content-Type': 'application/json' }
        }),
        payToken: (id: number, paymentDetails?: any) => fetchAPI(`/offers/${id}/pay-token`, {
            method: 'POST',
            body: paymentDetails ? JSON.stringify(paymentDetails) : undefined,
            headers: { 'Content-Type': 'application/json' }
        }),
        payCommission: (offerId: number) => fetchAPI(`/offers/${offerId}/pay-commission`, { method: 'POST' }),
        generateSaleDeed: (offerId: number) => fetchAPI(`/offers/${offerId}/generate-deed`, { method: 'POST' }),

        // Registration Workflow
        scheduleRegistrationSlot: (id: number, date: string) => fetchAPI(`/offers/${id}/schedule-registration-slot`, {
            method: 'PUT',
            body: JSON.stringify({ registration_date: date }),
            headers: { 'Content-Type': 'application/json' }
        }),
        acceptRegistrationSlot: (id: number) => fetchAPI(`/offers/${id}/accept-registration-slot`, { method: 'PUT' }),
        generateRegistrationOTP: (id: number) => fetchAPI(`/offers/${id}/registration-otp/generate`, { method: 'POST' }),
        verifyRegistrationOTP: (id: number, data: { otp: string, lat: number, lng: number }) => fetchAPI(`/offers/${id}/registration-otp/verify`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        uploadFinalDoc: (id: number, file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/offers/${id}/upload-final-doc`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                }
            }).then(res => res.json());
        },
        adminVerifyDoc: (id: number) => fetchAPI(`/offers/${id}/admin-verify-doc`, { method: 'POST' }),
    },
    users: {
        addFavorite: (propertyId: number) => fetchAPI(`/users/favorites/${propertyId}`, { method: 'POST' }),
        removeFavorite: (propertyId: number) => fetchAPI(`/users/favorites/${propertyId}`, { method: 'DELETE' }),
        getFavorites: () => fetchAPI('/users/favorites'),
        addRecentlyViewed: (propertyId: number) => fetchAPI(`/users/recently-viewed/${propertyId}`, { method: 'POST' }),
        getRecentlyViewed: () => fetchAPI('/users/recently-viewed'),
        updateProfile: (data: any) => fetchAPI('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        uploadAvatar: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/users/avatar`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to upload avatar');
            return response.json();
        }
    },
    agents: {
        findNearby: (lat: number, lng: number, radius = 50) =>
            fetchAPI(`/agents/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
        listAll: (params?: { skip?: number, limit?: number, specialty?: string, available_only?: boolean, max_commission?: number }) => {
            const query = new URLSearchParams();
            if (params?.skip) query.append('skip', String(params.skip));
            if (params?.limit) query.append('limit', String(params.limit));
            if (params?.specialty) query.append('specialty', params.specialty);
            if (params?.available_only) query.append('available_only', 'true');
            if (params?.max_commission) query.append('max_commission', String(params.max_commission));
            return fetchAPI(`/agents/all?${query.toString()}`);
        },
        get: (id: number) => fetchAPI(`/agents/${id}`),
        hire: (agentId: number, message: string) => fetchAPI(`/agents/${agentId}/hire?message=${encodeURIComponent(message)}`, { method: 'POST' }),
    },
    messages: {
        send: (data: { receiver_id: number, property_id?: number, message_text: string }) => fetchAPI('/messages/', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        getConversation: (userId: number) => fetchAPI(`/messages/conversation/${userId}`),
        getConversations: () => fetchAPI('/messages/conversations'),
    },
    payments: {
        uploadProof: (offerId: number, paymentType: string, amount: number, paymentMethod: string, file: File, transactionReference?: string) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${API_URL}/payments/upload-proof?offer_id=${offerId}&payment_type=${paymentType}&amount=${amount}&payment_method=${paymentMethod}&transaction_reference=${transactionReference || ''}`, {
                method: 'POST',
                body: formData,
                headers: {
                    ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
                }
            }).then(async res => {
                if (!res.ok) {
                    const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
                    throw new Error(error.detail || 'Upload failed');
                }
                return res.json();
            });
        },
        verify: (paymentId: number, action: string) => fetchAPI(`/payments/${paymentId}/verify?action=${action}`, { method: 'POST' }),
        getBreakdown: (offerId: number) => fetchAPI(`/payments/breakdown/${offerId}`),
    },
    admin: {
        getStats: () => fetchAPI('/admin/dashboard/stats'),
        getRevenue: (skip = 0, limit = 50) => fetchAPI(`/admin/finance/revenue?skip=${skip}&limit=${limit}`),
        getAuditLogs: (skip = 0, limit = 20) => fetchAPI(`/admin/audit-logs?skip=${skip}&limit=${limit}`),
        getUsers: (role?: string) => fetchAPI(`/admin/users${role ? `?role=${role}` : ''}`),
        updateUserStatus: (userId: number, isActive: boolean) => fetchAPI(`/admin/users/${userId}/status?is_active=${isActive}`, { method: 'PUT' }),
        getProperties: (status?: string) => fetchAPI(`/admin/properties${status ? `?status=${status}` : ''}`),
        updatePropertyStatus: (propertyId: number, status: string) => fetchAPI(`/admin/properties/${propertyId}/status?status=${status}`, { method: 'PUT' }),
        getFinancialSummary: () => fetchAPI('/admin/finance/summary'),
        getPropertyRevenue: () => fetchAPI('/admin/finance/property-revenue'),
        getDealPayments: (skip = 0, limit = 50) => fetchAPI(`/admin/finance/transactions?skip=${skip}&limit=${limit}`),
        getDealSettlements: () => fetchAPI('/admin/finance/settlements'),
        disburseCommission: (commissionId: number, transactionRef: string) => fetchAPI(`/admin/finance/disburse/${commissionId}?transaction_reference=${transactionRef}`, { method: 'POST' }),
        verifyDocument: (documentType: string, id: number, status: string) => fetchAPI(`/admin/finance/verify-document?document_type=${documentType}&id=${id}&status=${status}`, { method: 'POST' }),
    },
    ai: {
        generateDescription: (data: { features: string, tone: string, property_type: string }) => fetchAPI('/ai/generate-description', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
        estimatePrice: (data: { location: string, sqft: number, bhk: number, property_type: string }) => fetchAPI('/ai/estimate-price', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        }),
    },
    notifications: {
        list: (skip = 0, limit = 50, unreadOnly = false) => fetchAPI(`/notifications/?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`),
        markRead: (id: number) => fetchAPI(`/notifications/${id}/read`, { method: 'PUT' }),
        markAllRead: () => fetchAPI('/notifications/read-all', { method: 'PUT' }),
    },
}
