import { get, post } from '@/lib/api';
import {
    Transaction,
    CreateTransactionRequest,
    TransactionListResponse
} from '@/lib/types/transaction';

// Common response type that includes optional message
interface TransactionActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Get list of transactions (registrations) for current user
 */
export async function getTransactions(
    status?: string,
    page: number = 1,
    perPage: number = 20
): Promise<TransactionListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    return get<TransactionListResponse>(`/registrations?${params.toString()}`);
}

/**
 * Schedule registration / Start transaction process
 */
export async function scheduleRegistration(
    data: CreateTransactionRequest
): Promise<{ success: boolean; transaction_id: string }> {
    return post<{ success: boolean; transaction_id: string }>('/registrations', data);
}

/**
 * Get transaction details by ID
 */
export async function getTransactionById(
    transactionId: string
): Promise<{ success: boolean; transaction: Transaction }> {
    return get<{ success: boolean; transaction: Transaction }>(`/registrations/${transactionId}`);
}

/**
 * Send OTP to buyer
 */
export async function sendBuyerOtp(
    transactionId: string
): Promise<TransactionActionResponse> {
    return post<TransactionActionResponse>(`/registrations/${transactionId}/send-buyer-otp`);
}

/**
 * Verify buyer OTP
 */
export async function verifyBuyerOtp(
    transactionId: string,
    otpCode: string
): Promise<TransactionActionResponse> {
    return post<TransactionActionResponse>(`/registrations/${transactionId}/verify-buyer`, { otp_code: otpCode });
}

/**
 * Send OTP to seller
 */
export async function sendSellerOtp(
    transactionId: string
): Promise<TransactionActionResponse> {
    return post<TransactionActionResponse>(`/registrations/${transactionId}/send-seller-otp`);
}

/**
 * Verify seller OTP
 */
export async function verifySellerOtp(
    transactionId: string,
    otpCode: string
): Promise<TransactionActionResponse> {
    return post<TransactionActionResponse>(`/registrations/${transactionId}/verify-seller`, { otp_code: otpCode });
}

/**
 * Complete transaction (Agent)
 */
export async function completeTransaction(
    transactionId: string
): Promise<TransactionActionResponse> {
    return post<TransactionActionResponse>(`/registrations/${transactionId}/complete`);
}

