import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
    className?: string;
    onDismiss?: () => void;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: string; text: string }> = {
    info: {
        bg: 'bg-[var(--color-info-bg)]',
        border: 'border-[var(--color-info-border)]',
        icon: 'text-[var(--color-info)]',
        text: 'text-[var(--color-info)]',
    },
    success: {
        bg: 'bg-[var(--color-success-bg)]',
        border: 'border-[var(--color-success-border)]',
        icon: 'text-[var(--color-success)]',
        text: 'text-[var(--color-success)]',
    },
    warning: {
        bg: 'bg-[var(--color-warning-bg)]',
        border: 'border-[var(--color-warning-border)]',
        icon: 'text-[var(--color-warning)]',
        text: 'text-[var(--color-warning)]',
    },
    error: {
        bg: 'bg-[var(--color-error-bg)]',
        border: 'border-[var(--color-error-border)]',
        icon: 'text-[var(--color-error)]',
        text: 'text-[var(--color-error)]',
    },
};

const icons: Record<AlertVariant, React.ReactNode> = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
};

export function Alert({
    variant = 'info',
    title,
    children,
    className = '',
    onDismiss,
}: AlertProps) {
    const styles = variantStyles[variant];

    return (
        <div
            className={`
        flex gap-3 p-3
        rounded-[var(--radius-md)]
        border ${styles.bg} ${styles.border}
        ${className}
      `}
            role="alert"
        >
            <span className={`shrink-0 mt-0.5 ${styles.icon}`}>{icons[variant]}</span>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className={`text-sm font-medium ${styles.text}`}>{title}</p>
                )}
                <div className="text-sm text-[var(--gray-700)]">{children}</div>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="shrink-0 text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            )}
        </div>
    );
}
