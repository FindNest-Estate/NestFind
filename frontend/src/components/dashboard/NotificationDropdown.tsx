"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Info, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const data = await api.notifications.list(0, 20); // Fetch latest 20
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number, link?: string) => {
        try {
            await api.notifications.markRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            if (link) {
                setIsOpen(false);
                router.push(link);
            }
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            await api.notifications.markAllRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (error) {
            toast.error("Failed to mark all as read");
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        if (type.includes('VISIT')) return <Calendar size={16} className="text-blue-500" />;
        if (type.includes('OFFER') || type.includes('TOKEN')) return <DollarSign size={16} className="text-green-500" />;
        if (type.includes('MESSAGE')) return <MessageSquare size={16} className="text-purple-500" />;
        return <Info size={16} className="text-gray-500" />;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={loading}
                                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id, notification.action_url)}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                {getIcon(notification.notification_type)}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                        <Link href="/dashboard/notifications" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
