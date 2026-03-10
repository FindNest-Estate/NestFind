import React from 'react';
import { Inbox, Search, FileX, AlertCircle } from 'lucide-react';

type EmptyStateVariant = 'empty' | 'search' | 'error' | 'no-results';

interface EmptyStateProps {
    variant?: EmptyStateVariant;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
    compact?: boolean;
}

const icons: Record<EmptyStateVariant, React.ReactNode> = {
    empty: <Inbox className="w-10 h-10" />,
    search: <Search className="w-10 h-10" />,
    error: <AlertCircle className="w-10 h-10" />,
    'no-results': <FileX className="w-10 h-10" />,
};

export function EmptyState({
    variant = 'empty',
    title,
    description,
    action,
    className = '',
    compact = false,
}: EmptyStateProps) {
    return (
        <div
            className={`
        flex flex-col items-center justify-center text-center
        ${compact ? 'py-8' : 'py-16'}
        ${className}
      `}
        >
            <div className="text-[var(--gray-300)] mb-3">
                {icons[variant]}
            </div>
            <h3 className="text-[var(--text-body)] font-medium text-[var(--gray-900)] mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-[var(--text-caption)] text-[var(--gray-500)] max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
