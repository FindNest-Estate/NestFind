'use client';

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: ModalSize;
    children: React.ReactNode;
    footer?: React.ReactNode;
    closeOnOverlay?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export function Modal({
    open,
    onClose,
    title,
    description,
    size = 'md',
    children,
    footer,
    closeOnOverlay = true,
}: ModalProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 transition-opacity"
                onClick={closeOnOverlay ? onClose : undefined}
            />

            {/* Modal panel */}
            <div
                className={`
          relative w-full ${sizeStyles[size]}
          bg-white
          rounded-[var(--modal-radius)]
          shadow-[var(--shadow-xl)]
          max-h-[85vh]
          flex flex-col
        `}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between px-5 pt-5 pb-3">
                        <div>
                            {title && (
                                <h2 className="text-[var(--text-heading)] font-semibold text-[var(--gray-900)]">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-[var(--text-caption)] text-[var(--gray-500)] mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-[var(--radius-md)] text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-5 py-4 border-t border-[var(--gray-200)] flex items-center justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
