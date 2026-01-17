'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Bell,
    MessageCircle,
    Home,
    UserCheck,
    CheckCheck,
    Loader2,
    Inbox
} from 'lucide-react';
import { get, put } from '@/lib/api';

/**
 * Notifications Page - /notifications
 * 
 * Full list of user notifications with mark as read.
 */

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

interface Pagination {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    new_message: MessageCircle,
    assignment: Home,
    verification: UserCheck
};

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadNotifications = async (page: number = 1, append: boolean = false) => {
        if (page === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const data = await get<{ notifications: Notification[]; pagination: Pagination }>(
                `/notifications?page=${page}&per_page=20`
            );

            if (append) {
                setNotifications(prev => [...prev, ...data.notifications]);
            } else {
                setNotifications(data.notifications);
            }
            setPagination(data.pagination);
        } catch (err: any) {
            setError(err?.message || 'Failed to load notifications');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await put('/notifications/read-all', {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const handleMarkRead = async (notifId: string) => {
        try {
            await put(`/notifications/${notifId}/read`, {});
            setNotifications(prev =>
                prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No notifications yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {notifications.map(notif => {
                        const Icon = typeIcons[notif.type] || Bell;
                        return (
                            <div
                                key={notif.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-emerald-50/30' : ''
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-emerald-100' : 'bg-gray-100'
                                        }`}>
                                        <Icon className={`w-5 h-5 ${!notif.is_read ? 'text-emerald-600' : 'text-gray-500'}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className={`${!notif.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.body && (
                                                    <p className="text-sm text-gray-500 mt-1">{notif.body}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {formatTime(notif.created_at)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {notif.link && (
                                                    <Link
                                                        href={notif.link}
                                                        className="text-sm text-emerald-600 hover:underline"
                                                    >
                                                        View
                                                    </Link>
                                                )}
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => handleMarkRead(notif.id)}
                                                        className="p-1 text-gray-400 hover:text-emerald-600"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {pagination?.has_more && (
                <div className="text-center">
                    <button
                        onClick={() => loadNotifications(pagination.page + 1, true)}
                        disabled={isLoadingMore}
                        className="px-6 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoadingMore ? (
                            <Loader2 className="w-5 h-5 animate-spin inline" />
                        ) : (
                            'Load more'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
