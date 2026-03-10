import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/* ============================================================================
   DataTable — Dense, readable table for brokerage data
   ============================================================================ */

interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    width?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField?: string;
    onRowClick?: (row: T) => void;
    sortField?: string;
    sortDir?: 'asc' | 'desc';
    onSort?: (field: string) => void;
    loading?: boolean;
    emptyMessage?: string;
    className?: string;
    compact?: boolean;
}

export function DataTable<T extends Record<string, any>>({
    columns,
    data,
    keyField = 'id',
    onRowClick,
    sortField,
    sortDir,
    onSort,
    loading = false,
    emptyMessage = 'No data found',
    className = '',
    compact = false,
}: DataTableProps<T>) {
    const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
    const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-2.5';

    return (
        <div className={`overflow-x-auto border border-[var(--gray-200)] rounded-[var(--card-radius)] bg-white ${className}`}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`
                  ${headerPadding}
                  text-left text-xs font-semibold text-[var(--gray-600)] uppercase tracking-wider
                  ${col.align === 'center' ? 'text-center' : ''}
                  ${col.align === 'right' ? 'text-right' : ''}
                  ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--gray-900)]' : ''}
                `}
                                style={col.width ? { width: col.width } : undefined}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <span className="inline-flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && sortField === col.key && (
                                        sortDir === 'asc'
                                            ? <ChevronUp className="w-3 h-3" />
                                            : <ChevronDown className="w-3 h-3" />
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={`skeleton-${i}`}>
                                {columns.map((col) => (
                                    <td key={col.key} className={cellPadding}>
                                        <div className="h-4 bg-[var(--gray-100)] rounded animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-12 text-center text-sm text-[var(--gray-500)]"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={row[keyField]}
                                className={`
                  hover:bg-[var(--gray-50)] transition-colors duration-100
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`
                      ${cellPadding}
                      text-[var(--gray-700)]
                      ${col.align === 'center' ? 'text-center' : ''}
                      ${col.align === 'right' ? 'text-right' : ''}
                    `}
                                    >
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* ============================================================================
   Pagination component for DataTable
   ============================================================================ */

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    perPage: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    return (
        <div className="flex items-center justify-between py-3 px-4 text-xs text-[var(--gray-500)]">
            <span>
                Showing {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--gray-300)] hover:bg-[var(--gray-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>
                <span className="px-2 font-medium text-[var(--gray-700)]">
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--gray-300)] hover:bg-[var(--gray-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
