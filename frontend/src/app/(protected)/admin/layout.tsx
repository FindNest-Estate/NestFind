/**
 * Admin Dashboard Layout
 * 
 * Shell layout for ADMIN role
 * Assumes route protection already handled by parent layout
 */

import { ReactNode } from 'react';
import AdminHeader from '@/components/AdminHeader';

export default function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
