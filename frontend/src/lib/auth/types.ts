/**
 * Frontend Authentication Type Definitions
 * 
 * Based on:
 * - frontend/docs/auth_contract.md
 * - frontend/docs/auth_state_machine.md
 * 
 * DO NOT modify these types without updating documentation.
 */

// ============================================================================
// User Enums
// ============================================================================

export enum UserRole {
    USER = 'USER',
    AGENT = 'AGENT',
    ADMIN = 'ADMIN',
}

export enum UserStatus {
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
    ACTIVE = 'ACTIVE',
    IN_REVIEW = 'IN_REVIEW',
    DECLINED = 'DECLINED',
    SUSPENDED = 'SUSPENDED',
}

// ============================================================================
// UI States
// ============================================================================

export enum AuthState {
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    OTP_REQUIRED = 'OTP_REQUIRED',
    AUTHENTICATED = 'AUTHENTICATED',
    IN_REVIEW = 'IN_REVIEW',
    DECLINED = 'DECLINED',
    SUSPENDED = 'SUSPENDED',
    LOCKED = 'LOCKED',
}

// ============================================================================
// User Types
// ============================================================================

export interface AuthUser {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterUserRequest {
    full_name: string;
    email: string;
    password: string;
    mobile_number?: string;
}

export interface RegisterAgentRequest extends RegisterUserRequest {
    license_id: string;
    service_radius_km: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: 'bearer';
    user: AuthUser;
}

export interface LoginErrorResponse {
    success: false;
    error: string;
    locked_until?: string; // ISO DateTime
}

export interface OTPVerifyRequest {
    user_id: string;
    otp: string;
}

export interface OTPGenerateRequest {
    user_id: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    error?: string;
    user_id?: string; // Returned on registration for OTP flow
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: 'bearer';
}

// ============================================================================
// Lockout State
// ============================================================================

export interface LockoutState {
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingSeconds: number;
}

// ============================================================================
// Route Types
// ============================================================================

export type RouteType =
    | 'public'
    | 'auth'           // login, register (unauthenticated only)
    | 'protected'      // requires authentication
    | 'protected-user' // requires USER role
    | 'protected-agent' // requires AGENT role
    | 'protected-admin' // requires ADMIN role
    | 'status-specific'; // IN_REVIEW, DECLINED, SUSPENDED

// ============================================================================
// State Mapping Helpers
// ============================================================================

/**
 * Map backend UserStatus to frontend AuthState
 */
export function userStatusToAuthState(
    status: UserStatus,
    hasToken: boolean
): AuthState {
    if (!hasToken) return AuthState.UNAUTHENTICATED;

    switch (status) {
        case UserStatus.PENDING_VERIFICATION:
            return AuthState.OTP_REQUIRED;
        case UserStatus.ACTIVE:
            return AuthState.AUTHENTICATED;
        case UserStatus.IN_REVIEW:
            return AuthState.IN_REVIEW;
        case UserStatus.DECLINED:
            return AuthState.DECLINED;
        case UserStatus.SUSPENDED:
            return AuthState.SUSPENDED;
        default:
            return AuthState.UNAUTHENTICATED;
    }
}

/**
 * Check if a status allows dashboard access
 */
export function canAccessDashboard(status: UserStatus): boolean {
    return status === UserStatus.ACTIVE;
}

/**
 * Check if a role can access a specific role-protected route
 */
export function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
    // Admin can access everything
    if (userRole === UserRole.ADMIN) return true;
    // Otherwise, exact role match required
    return userRole === requiredRole;
}
