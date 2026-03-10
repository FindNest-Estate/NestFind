import React from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    inputSize?: InputSize;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
    error?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    hint?: string;
    error?: string;
    inputSize?: InputSize;
    options: { label: string; value: string }[];
    placeholder?: string;
}

const sizeStyles: Record<InputSize, string> = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-3.5 py-2.5 text-sm',
};

const baseInput = `
  w-full
  border border-[var(--gray-300)]
  rounded-[var(--input-radius)]
  bg-white
  text-[var(--gray-900)]
  placeholder:text-[var(--gray-400)]
  focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand-ring)]
  disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-500)] disabled:cursor-not-allowed
  transition-colors duration-150
`.trim();

const errorInput = 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-red-200';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, error, inputSize = 'md', className = '', id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="space-y-1">
                {label && (
                    <label htmlFor={inputId} className="block text-xs font-medium text-[var(--gray-700)]">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`${baseInput} ${sizeStyles[inputSize]} ${error ? errorInput : ''} ${className}`}
                    {...props}
                />
                {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
                {hint && !error && <p className="text-xs text-[var(--gray-500)]">{hint}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, hint, error, className = '', id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="space-y-1">
                {label && (
                    <label htmlFor={inputId} className="block text-xs font-medium text-[var(--gray-700)]">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={inputId}
                    className={`${baseInput} px-3 py-2 text-sm min-h-[80px] resize-y ${error ? errorInput : ''} ${className}`}
                    {...props}
                />
                {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
                {hint && !error && <p className="text-xs text-[var(--gray-500)]">{hint}</p>}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';

export function Select({
    label,
    hint,
    error,
    inputSize = 'md',
    options,
    placeholder,
    className = '',
    id,
    ...props
}: SelectProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-medium text-[var(--gray-700)]">
                    {label}
                </label>
            )}
            <select
                id={inputId}
                className={`${baseInput} ${sizeStyles[inputSize]} ${error ? errorInput : ''} appearance-none ${className}`}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
            {hint && !error && <p className="text-xs text-[var(--gray-500)]">{hint}</p>}
        </div>
    );
}
