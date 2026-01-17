/**
 * Core API Client
 * 
 * Centralized fetch wrapper with:
 * - Automatic token refresh on 401
 * - Error handling
 * - Retry logic
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class RateLimitError extends ApiError {
    constructor() {
        super('Too many requests. Please wait.', 429);
        this.name = 'RateLimitError';
    }
}

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
    skipRetry?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                return false;
            }

            return true;
        } catch {
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Core API client with automatic token refresh
 */
export async function apiClient<T = any>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { skipAuth = false, skipRetry = false, ...fetchOptions } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
        ...fetchOptions,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(typeof window !== 'undefined' && localStorage.getItem('access_token')
                ? { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                : {}),
            ...fetchOptions.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Handle 401 - Token expired
        if (response.status === 401 && !skipAuth && !skipRetry) {
            const refreshed = await refreshAccessToken();

            if (refreshed) {
                // Retry original request once
                return apiClient<T>(endpoint, { ...options, skipRetry: true });
            } else {
                // Refresh failed - redirect to login
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?session_expired=true';
                }
                throw new ApiError('Session expired', 401);
            }
        }

        // Handle 403 - Forbidden (status change)
        if (response.status === 403) {
            throw new ApiError('Access forbidden', 403);
        }

        // Handle 429 - Rate limited
        if (response.status === 429) {
            throw new RateLimitError();
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        let data: any;
        if (isJson) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Handle non-2xx responses
        if (!response.ok) {
            throw new ApiError(
                data?.error || data?.message || `Request failed with status ${response.status}`,
                response.status,
                data
            );
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        // Network or other errors
        throw new ApiError(
            error instanceof Error ? error.message : 'Network error',
            0
        );
    }
}

/**
 * GET request
 */
export function get<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export function post<T = any>(
    endpoint: string,
    body?: any,
    options?: FetchOptions
): Promise<T> {
    return apiClient<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * PUT request
 */
export function put<T = any>(
    endpoint: string,
    body?: any,
    options?: FetchOptions
): Promise<T> {
    return apiClient<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * DELETE request
 */
export function del<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
}
