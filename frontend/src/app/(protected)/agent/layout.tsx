'use client';

import { ReactNode } from 'react';
import AgentLayout from '@/components/agent/AgentLayout';

export default function AgentDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <AgentLayout>
            {children}
        </AgentLayout>
    );
}
