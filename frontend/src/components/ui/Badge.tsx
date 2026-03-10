import React from 'react';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info' | 'frozen' | 'brand' | 'neutral';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-[var(--gray-100)] text-[var(--gray-700)] border-[var(--gray-200)]',
    secondary: 'bg-[var(--gray-100)] text-[var(--gray-600)] border-[var(--gray-200)]',
    outline: 'bg-transparent text-[var(--gray-700)] border-[var(--gray-300)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    error: 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error-border)]',
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
    frozen: 'bg-[var(--color-frozen-bg)] text-[var(--color-frozen)] border-[var(--color-frozen-border)]',
    brand: 'bg-white text-[#FF385C] border-[#FF385C] font-bold shadow-sm',
    neutral: 'bg-[var(--gray-50)] text-[var(--gray-500)] border-[var(--gray-200)]',
};

const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-[var(--gray-400)]',
    secondary: 'bg-[var(--gray-400)]',
    outline: 'bg-[var(--gray-500)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    error: 'bg-[var(--color-error)]',
    info: 'bg-[var(--color-info)]',
    frozen: 'bg-[var(--color-frozen)]',
    brand: 'bg-[var(--color-brand)]',
    neutral: 'bg-[var(--gray-400)]',
};

export function Badge({
    variant = 'default',
    children,
    icon,
    className = '',
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        text-xs font-semibold
        px-2 py-0.5
        rounded-[var(--badge-radius)]
        border
        whitespace-nowrap
        ${variantStyles[variant]}
        ${className}
      `.trim()}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
            )}
            {icon && <span className="shrink-0 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
            {children}
        </span>
    );
}

/* ============================================================================
   Pre-mapped badge variants for common deal/offer/property statuses.
   Use: <StatusBadge status="COMPLETED" />
   ============================================================================ */

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    // Deal statuses
    INITIATED: { label: 'Initiated', variant: 'info' },
    VISIT_SCHEDULED: { label: 'Visit Scheduled', variant: 'info' },
    OFFER_MADE: { label: 'Offer Made', variant: 'info' },
    NEGOTIATION: { label: 'Negotiating', variant: 'warning' },
    PRICE_AGREED: { label: 'Price Agreed', variant: 'success' },
    TOKEN_PENDING: { label: 'Token Pending', variant: 'warning' },
    TOKEN_PAID: { label: 'Token Paid', variant: 'success' },
    AGREEMENT_SIGNED: { label: 'Agreement Signed', variant: 'success' },
    REGISTRATION: { label: 'Registration', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    COMMISSION_RELEASED: { label: 'Commission Released', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'error' },
    EXPIRED: { label: 'Expired', variant: 'neutral' },

    // Offer statuses
    PENDING: { label: 'Pending', variant: 'warning' },
    ACCEPTED: { label: 'Accepted', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'error' },
    COUNTERED: { label: 'Countered', variant: 'info' },
    WITHDRAWN: { label: 'Withdrawn', variant: 'neutral' },

    // Property statuses
    DRAFT: { label: 'Draft', variant: 'neutral' },
    PENDING_ASSIGNMENT: { label: 'Pending Assignment', variant: 'warning' },
    ASSIGNED: { label: 'Assigned', variant: 'info' },
    VERIFICATION_IN_PROGRESS: { label: 'Verifying', variant: 'warning' },
    ACTIVE: { label: 'Active', variant: 'success' },
    RESERVED: { label: 'Reserved', variant: 'brand' },
    SOLD: { label: 'Sold', variant: 'success' },

    // Visit statuses
    REQUESTED: { label: 'Requested', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    CHECKED_IN: { label: 'Checked In', variant: 'info' },
    NO_SHOW: { label: 'No Show', variant: 'error' },

    // Dispute statuses
    OPEN: { label: 'Open', variant: 'error' },
    INVESTIGATING: { label: 'Investigating', variant: 'warning' },
    RESOLVED: { label: 'Resolved', variant: 'success' },
    FROZEN: { label: 'Frozen', variant: 'frozen' },

    // Finance
    VERIFIED: { label: 'Verified', variant: 'success' },
    AUTHORIZED: { label: 'Authorized', variant: 'success' },
    RELEASED: { label: 'Released', variant: 'success' },
};

interface StatusBadgeProps {
    status: string;
    dot?: boolean;
    className?: string;
}

export function StatusBadge({ status, dot = true, className }: StatusBadgeProps) {
    const mapped = STATUS_MAP[status] || { label: status, variant: 'default' as BadgeVariant };
    return (
        <Badge variant={mapped.variant} dot={dot} className={className}>
            {mapped.label}
        </Badge>
    );
}
