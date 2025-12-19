/**
 * Authentication API Client
 * 
 * All authentication-related API calls.
 * Based on frontend/docs/auth_contract.md
 */

import { post } from './api';
import type {
    RegisterUserRequest,
    RegisterAgentRequest,
    LoginRequest,
    LoginResponse,
    LoginErrorResponse,
    OTPVerifyRequest,
    OTPGenerateRequest,
    AuthResponse,
    RefreshTokenResponse,
    AuthUser,
} from './auth/types';

// ============================================================================
// Registration
// ============================================================================

/**
 * Register new user (Buyer/Seller)
 * 
 * Endpoint: POST /auth/register/user
 * Returns: 202 Accepted
 */
export async function registerUser(
    data: RegisterUserRequest
): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/register/user', data, { skipAuth: true });
}

/**
 * Register new agent
 * 
 * Endpoint: POST /auth/register/agent
 * Returns: 202 Accepted
 */
export async function registerAgent(
    data: RegisterAgentRequest
): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/register/agent', data, { skipAuth: true });
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Login with email and password
 * 
 * Endpoint: POST /auth/login
 * Returns: access_token, refresh_token, user
 * 
 * May return lockout info in error response
 */
export async function login(
    data: LoginRequest
): Promise<LoginResponse | LoginErrorResponse> {
    try {
        return await post<LoginResponse>('/auth/login', data, { skipAuth: true });
    } catch (error: any) {
        // Extract lockout info if present
        if (error.data?.locked_until) {
            return {
                success: false,
                error: error.data.error || 'Account locked',
                locked_until: error.data.locked_until,
            };
        }
        throw error;
    }
}

/**
 * Logout (revoke session)
 * 
 * Endpoint: POST /auth/logout
 */
export async function logout(): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/logout');
}

/**
 * Refresh access token
 * 
 * Endpoint: POST /auth/refresh
 * Note: This is called automatically by apiClient on 401
 */
export async function refreshToken(): Promise<RefreshTokenResponse> {
    return post<RefreshTokenResponse>('/auth/refresh', undefined, { skipAuth: true });
}

// ============================================================================
// OTP Verification
// ============================================================================

/**
 * Generate and send OTP
 * 
 * Endpoint: POST /auth/otp/generate
 */
export async function generateOTP(
    data: OTPGenerateRequest
): Promise<{ otp_id: string; expires_at: string; message: string }> {
    return post('/auth/otp/generate', data, { skipAuth: true });
}

/**
 * Verify OTP
 * 
 * Endpoint: POST /auth/otp/verify
 * 
 * May return lockout info in error response
 */
export async function verifyOTP(
    data: OTPVerifyRequest
): Promise<AuthResponse & { locked_until?: string }> {
    try {
        return await post<AuthResponse>('/auth/otp/verify', data, { skipAuth: true });
    } catch (error: any) {
        // Extract lockout info if present
        if (error.data?.locked_until) {
            return {
                success: false,
                error: error.data.error || 'Account locked',
                locked_until: error.data.locked_until,
            };
        }
        throw error;
    }
}

// ============================================================================
// User Info
// ============================================================================

/**
 * Get current user info
 * 
 * Endpoint: GET /user/me
 * 
 * CRITICAL: This is the ONLY source of truth for user status and role.
 * Never cache this data for authorization decisions.
 */
export async function getCurrentUser(): Promise<AuthUser> {
    return post<AuthUser>('/user/me');
}

// ============================================================================
// Admin Actions
// ============================================================================

/**
 * Approve agent (Admin only)
 * 
 * Endpoint: POST /admin/agents/{agent_id}/approve
 */
export async function approveAgent(
    agentId: string,
    decisionReason?: string
): Promise<{ status: string }> {
    return post(`/admin/agents/${agentId}/approve`, { decision_reason: decisionReason });
}

/**
 * Decline agent (Admin only)
 * 
 * Endpoint: POST /admin/agents/{agent_id}/decline
 */
export async function declineAgent(
    agentId: string,
    decisionReason?: string
): Promise<{ status: string }> {
    return post(`/admin/agents/${agentId}/decline`, { decision_reason: decisionReason });
}
