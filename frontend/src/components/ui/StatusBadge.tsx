'use client';

import React from 'react';

const STATUS_MAP: Record<string, { bg: string; text: string; border: string }> = {
    // General
    ACTIVE: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    AVAILABLE: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    COMPLETED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    APPROVED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    OPERATIONAL: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    RESOLVED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },

    PENDING: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    PENDING_APPROVAL: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    IN_PROGRESS: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    UNDER_REVIEW: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },

    SOLD: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    CLOSED: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },

    REJECTED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    FAILED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    SUSPENDED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    CANCELLED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    OPEN: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    DISPUTED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    FROZEN: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },

    DEGRADED: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },

    // Roles
    ADMIN: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    AGENT: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    USER: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    BUYER: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    SELLER: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
};

const FALLBACK = { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const key = status?.toUpperCase().replace(/[\s-]+/g, '_') || '';
    const colors = STATUS_MAP[key] || FALLBACK;
    const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold leading-4 rounded-full border ${className}`}
            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
        >
            {label}
        </span>
    );
}
