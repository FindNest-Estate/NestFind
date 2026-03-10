import React from 'react';

type CardVariant = 'default' | 'outlined' | 'flat';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
    default: 'bg-white border border-[var(--gray-200)] rounded-[var(--card-radius)]',
    outlined: 'bg-white border border-[var(--gray-300)] rounded-[var(--card-radius)]',
    flat: 'bg-[var(--gray-50)] rounded-[var(--card-radius)]',
};

const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
};

export function Card({
    variant = 'default',
    padding,
    hover = false,
    className = '',
    children,
    onClick,
    ...props
}: CardProps) {
    return (
        <div
            className={`
        ${variantStyles[variant]}
        ${padding ? paddingMap[padding] : ''}
        ${hover ? 'hover:shadow-[var(--shadow-sm)] transition-shadow duration-150 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `.trim()}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
}

/* ============================================================================
   Sub-components — shadcn/ui-compatible API
   ============================================================================ */

interface SubProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

/** Card header section — accepts children (typically CardTitle + CardDescription) */
export function CardHeader({ children, className = '', ...props }: SubProps) {
    return (
        <div className={`flex flex-col space-y-1.5 px-5 pt-5 pb-2 ${className}`} {...props}>
            {children}
        </div>
    );
}

/** Card body content area */
export function CardContent({ children, className = '', ...props }: SubProps) {
    return (
        <div className={`px-5 pb-5 ${className}`} {...props}>
            {children}
        </div>
    );
}

/** Card footer — bottom action area */
export function CardFooter({ children, className = '', ...props }: SubProps) {
    return (
        <div
            className={`flex items-center px-5 py-4 border-t border-[var(--gray-200)] ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

/* ============================================================================
   Typography sub-components
   ============================================================================ */

interface TextProps extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
}

/** Card title — typically used inside CardHeader */
export function CardTitle({ children, className = '', ...props }: TextProps) {
    return (
        <h3
            className={`text-[var(--text-subheading)] font-semibold text-[var(--gray-900)] leading-tight ${className}`}
            {...props}
        >
            {children}
        </h3>
    );
}

interface DescProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children: React.ReactNode;
}

/** Card description — typically used inside CardHeader below CardTitle */
export function CardDescription({ children, className = '', ...props }: DescProps) {
    return (
        <p className={`text-[var(--text-caption)] text-[var(--gray-500)] ${className}`} {...props}>
            {children}
        </p>
    );
}

