/**
 * Admin Dashboard Layout
 * 
 * Shell layout for ADMIN role
 * Role enforcement via RoleGuard component
 */

'use client';

import { ReactNode } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import RoleGuard from '@/components/guards/RoleGuard';
import { UserRole } from '@/lib/auth/types';

export default function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
            <AdminLayout>
                {children}
            </AdminLayout>
        </RoleGuard>
    );
}
