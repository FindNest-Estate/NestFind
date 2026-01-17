'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Bell, Check, CheckCheck, MessageCircle, Home, UserCheck, Loader2,
    Calendar, CalendarCheck, CalendarX, DollarSign, FileCheck, AlertCircle,
    ClipboardList, Handshake
} from 'lucide-react';
import { get, put } from '@/lib/api';

/**
 * NotificationBell Component
 * 
 * Shows unread count and dropdown with recent notifications.
 * Used in the navbar.
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

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    // Messages
    new_message: MessageCircle,
    MESSAGE: MessageCircle,

    // Assignments
    assignment: Home,
    ASSIGNMENT: Home,
    PROPERTY_ASSIGNED: Home,

    // Verification
    verification: UserCheck,
    VERIFICATION: UserCheck,

    // Visits
    VISIT_REQUESTED: Calendar,
    VISIT_APPROVED: CalendarCheck,
    VISIT_REJECTED: CalendarX,
    VISIT_COMPLETED: CalendarCheck,

    // Offers
    OFFER_RECEIVED: DollarSign,
    OFFER_ACCEPTED: Handshake,
    OFFER_REJECTED: AlertCircle,
    OFFER_COUNTERED: DollarSign,

    // Transactions / Registrations
    REGISTRATION_SCHEDULED: ClipboardList,
    TRANSACTION_COMPLETED: FileCheck,

    // Default
    default: Bell
};

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch unread count
    useEffect(() => {
        async function fetchCount() {
            try {
                const data = await get<{ count: number }>('/notifications/unread-count');
                setUnreadCount(data.count);
            } catch (err) {
                console.error('Failed to fetch unread count:', err);
            }
        }
        fetchCount();
        // Poll every 30 seconds
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = async () => {
        if (!isOpen) {
            setIsLoading(true);
            try {
                const data = await get<{ notifications: Notification[] }>('/notifications?per_page=5');
                setNotifications(data.notifications);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setIsLoading(false);
            }
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAllRead = async () => {
        try {
            await put('/notifications/read-all', {});
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) {
            try {
                await put(`/notifications/${notif.id}/read`, {});
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                );
            } catch (err) {
                console.error('Failed to mark read:', err);
            }
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-900">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-6 flex justify-center">
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <Bell className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const Icon = typeIcons[notif.type] || Bell;
                                return (
                                    <Link
                                        key={notif.id}
                                        href={notif.link || '/notifications'}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`block p-4 hover:bg-gray-50 border-b border-gray-50 ${!notif.is_read ? 'bg-emerald-50/50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-emerald-100' : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-4 h-4 ${!notif.is_read ? 'text-emerald-600' : 'text-gray-500'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notif.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.body && (
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <Link
                        href="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="block text-center py-3 text-sm text-emerald-600 hover:bg-gray-50 border-t border-gray-100"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
