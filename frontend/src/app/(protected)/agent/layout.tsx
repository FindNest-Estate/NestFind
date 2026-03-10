'use client';

import { ReactNode } from 'react';
import AgentLayout from '@/components/agent/AgentLayout';
import RoleGuard from '@/components/guards/RoleGuard';
import { UserRole } from '@/lib/auth/types';

export default function AgentDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <RoleGuard allowedRoles={[UserRole.AGENT, UserRole.ADMIN]}>
            <AgentLayout>
                {children}
            </AgentLayout>
        </RoleGuard>
    );
}
