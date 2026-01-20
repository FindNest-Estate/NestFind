'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export default function AdminBreadcrumb() {
    const pathname = usePathname();

    // Ignore root admin path since it redirects to dashboard
    if (pathname === '/admin') return null;

    const segments = pathname.split('/').filter(Boolean);

    // Map of segment to readable label
    const labelMap: Record<string, string> = {
        'admin': 'Admin',
        'dashboard': 'Overview',
        'users': 'User Management',
        'agents': 'Agent Approvals',
        'properties': 'Properties',
        'transactions': 'Transactions',
        'disputes': 'Disputes',
        'settings': 'Settings',
        'reports': 'Reports'
    };

    const getLabel = (segment: string) => {
        // Check map first
        if (labelMap[segment]) return labelMap[segment];

        // If it looks like an ID (long string with numbers), shorten it
        if (segment.length > 20 || /\d/.test(segment)) {
            return `${segment.slice(0, 8)}...`;
        }

        // Fallback: Capitalize first letter
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    return (
        <nav className="flex items-center text-sm text-slate-500">
            <Link
                href="/admin/dashboard"
                className="flex items-center hover:text-emerald-600 transition-colors"
                title="Dashboard"
            >
                <Home className="w-4 h-4" />
            </Link>

            {segments.slice(1).map((segment, index) => {
                // Since we skipped 'admin' (index 0) in the visual slice, 
                // we need to construct path correctly.
                // segments array: ['admin', 'users', '123']
                // slice(1) loop 1: segment='users', path='/admin/users'
                // slice(1) loop 2: segment='123', path='/admin/users/123'

                const path = `/${segments.slice(0, index + 2).join('/')}`;
                const isLast = index === segments.slice(1).length - 1;

                return (
                    <Fragment key={path}>
                        <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
                        {isLast ? (
                            <span className="font-medium text-slate-900">
                                {getLabel(segment)}
                            </span>
                        ) : (
                            <Link
                                href={path}
                                className="hover:text-emerald-600 transition-colors"
                            >
                                {getLabel(segment)}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
