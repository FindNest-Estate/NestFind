import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    breadcrumb?: { label: string; href?: string }[];
    className?: string;
}

export function PageHeader({
    title,
    subtitle,
    actions,
    breadcrumb,
    className = '',
}: PageHeaderProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {/* Breadcrumb */}
            {breadcrumb && breadcrumb.length > 0 && (
                <nav className="flex items-center gap-1 mb-2 text-xs text-[var(--gray-500)]">
                    {breadcrumb.map((item, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-[var(--gray-300)]">/</span>}
                            {item.href ? (
                                <a
                                    href={item.href}
                                    className="hover:text-[var(--gray-700)] transition-colors"
                                >
                                    {item.label}
                                </a>
                            ) : (
                                <span className="text-[var(--gray-700)]">{item.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            {/* Title row */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-[var(--text-display)] font-bold text-[var(--gray-900)] leading-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[var(--text-body)] text-[var(--gray-500)] mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
