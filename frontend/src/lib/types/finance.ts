// Phase 5A: Financial Types (Commission Lifecycle + Counterparty Confirmation)
// All amounts are "declared" or "calculated", never "paid" or "received" by NestFind

export interface LedgerEntry {
    id: string;
    type: LedgerEntryType;
    amount: number;
    direction: 'CREDIT' | 'DEBIT' | 'INFO';
    description: string;
    verification_status: VerificationStatus;
    created_at: string;
    created_by: string;
    // Phase 5A: Counterparty confirmation
    counterparty_confirmed: boolean;
    counterparty_confirmed_by?: string | null;
    counterparty_confirmed_at?: string | null;
    // Phase 5A: Metadata (proof, payment method, etc.)
    metadata?: Record<string, unknown>;
}

export interface Ledger {
    id: string;
    total_deal_value: number;
    total_commission: number;
    agent_commission: number;
    platform_fee: number;
    status: LedgerStatus;
    entries: LedgerEntry[];
    // Phase 5A: Commission lifecycle
    commission_status: CommissionStatus;
    cooling_off_expires_at?: string | null;
    settlement_authorized_at?: string | null;
}

export interface LedgerResponse {
    success: boolean;
    ledger?: Ledger;
    error?: string;
}

export type LedgerEntryType =
    // Phase 4A (Declarative)
    | 'BOOKING_DECLARED'
    | 'COMMISSION_CALCULATED'
    | 'PLATFORM_FEE'
    | 'AGENT_COMMISSION'
    | 'ADJUSTMENT'
    // Phase 5A (Broker-Coordinated)
    | 'BOOKING_RECEIVED'
    | 'BALANCE_PAYMENT_DECLARED'
    | 'TOKEN_FORFEITED'
    | 'TOKEN_REFUND_CLAIMED'
    | 'TOKEN_REFUNDED'
    | 'COMMISSION_PAYABLE'
    | 'PLATFORM_FEE_SETTLED'
    | 'AGENT_COMMISSION_SETTLED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type LedgerStatus = 'PENDING' | 'CALCULATED' | 'VERIFIED' | 'FROZEN' | 'SETTLED';

export type CommissionStatus =
    | 'CALCULATED'
    | 'EARNED'
    | 'COOLING_OFF'
    | 'PAYABLE'
    | 'SETTLEMENT_PENDING'
    | 'SETTLED'
    | 'VOIDED'
    | 'FROZEN';

// Labels for UI rendering (Refinement 2: Legal-safe language)
export const ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
    BOOKING_DECLARED: 'Booking Amount Declared',
    COMMISSION_CALCULATED: 'Commission Calculated',
    PLATFORM_FEE: 'Platform Fee',
    AGENT_COMMISSION: 'Agent Commission',
    ADJUSTMENT: 'Admin Adjustment',
    // Phase 5A
    BOOKING_RECEIVED: 'Booking Payment Recorded',
    BALANCE_PAYMENT_DECLARED: 'Balance Payment Declared',
    TOKEN_FORFEITED: 'Token Forfeited',
    TOKEN_REFUND_CLAIMED: 'Token Refund Claimed',
    TOKEN_REFUNDED: 'Token Refunded',
    COMMISSION_PAYABLE: 'Commission Payable',
    PLATFORM_FEE_SETTLED: 'Platform Fee Settled',
    AGENT_COMMISSION_SETTLED: 'Agent Commission Settled',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    PENDING: 'Pending Verification',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
};

export const LEDGER_STATUS_LABELS: Record<LedgerStatus, string> = {
    PENDING: 'Pending',
    CALCULATED: 'Calculated',
    VERIFIED: 'Verified',
    FROZEN: 'Frozen (Dispute)',
    SETTLED: 'Ready for Settlement',
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
    CALCULATED: 'Calculated',
    EARNED: 'Earned',
    COOLING_OFF: 'Cooling-Off Period',
    PAYABLE: 'Ready for Settlement',
    SETTLEMENT_PENDING: 'Settlement Authorized',
    SETTLED: 'Settled',
    VOIDED: 'Voided',
    FROZEN: 'Frozen (Dispute)',
};

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
    CALCULATED: 'text-gray-500 bg-gray-50 border-gray-200',
    EARNED: 'text-blue-700 bg-blue-50 border-blue-200',
    COOLING_OFF: 'text-amber-700 bg-amber-50 border-amber-200',
    PAYABLE: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    SETTLEMENT_PENDING: 'text-purple-700 bg-purple-50 border-purple-200',
    SETTLED: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    VOIDED: 'text-red-700 bg-red-50 border-red-200',
    FROZEN: 'text-blue-900 bg-blue-100 border-blue-300',
};

export const PAYMENT_METHODS = [
    { value: 'UPI', label: 'UPI' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'DD', label: 'Demand Draft' },
    { value: 'CASH', label: 'Cash' },
    { value: 'OTHER', label: 'Other' },
] as const;

// Phase 5A: Commission lifecycle and release conditions
export interface CommissionStatusResponse {
    success: boolean;
    commission?: {
        status: CommissionStatus;
        total_commission: number;
        agent_commission: number;
        platform_fee: number;
        cooling_off_expires_at: string | null;
        settlement_authorized_at: string | null;
        deal_status: string;
        deal_frozen: boolean;
        release_conditions: Record<string, {
            met: boolean;
            label: string;
            detail: string;
        }>;
    };
    error?: string;
}
