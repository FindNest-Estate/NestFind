'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export default function AgentBreadcrumb() {
    const pathname = usePathname();

    // Ignore root agent path
    if (pathname === '/agent') return null;

    const segments = pathname.split('/').filter(Boolean);

    // Map of segment to readable label
    const labelMap: Record<string, string> = {
        'agent': 'Agent Portal',
        'dashboard': 'Dashboard',
        'assignments': 'Assignments',
        'visits': 'Visits',
        'calendar': 'Calendar',
        'analytics': 'Analytics',
        'profile': 'Profile',
        'verification': 'Verification'
    };

    const getLabel = (segment: string) => {
        if (labelMap[segment]) return labelMap[segment];
        if (segment.length > 20 || /\d/.test(segment)) {
            return `${segment.slice(0, 8)}...`;
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    return (
        <nav className="flex items-center text-sm text-gray-500">
            <Link
                href="/agent/dashboard"
                className="flex items-center hover:text-rose-600 transition-colors"
                title="Dashboard"
            >
                <Home className="w-4 h-4" />
            </Link>

            {segments.slice(1).map((segment, index) => {
                const path = `/${segments.slice(0, index + 2).join('/')}`;
                const isLast = index === segments.slice(1).length - 1;

                return (
                    <Fragment key={path}>
                        <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                        {isLast ? (
                            <span className="font-medium text-gray-900">
                                {getLabel(segment)}
                            </span>
                        ) : (
                            <Link
                                href={path}
                                className="hover:text-rose-600 transition-colors"
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
