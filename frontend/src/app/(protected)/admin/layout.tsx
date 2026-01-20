/**
 * Admin Dashboard Layout
 * 
 * Shell layout for ADMIN role
 * Assumes route protection already handled by parent layout
 */

import { ReactNode } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}
