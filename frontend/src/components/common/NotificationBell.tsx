import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    action_url?: string;
    notification_type: string;
}

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:8000/notifications/?limit=10', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:8000/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark read", error);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border">
                    <div className="py-2">
                        <div className="px-4 py-2 border-b flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                            <button
                                onClick={fetchNotifications}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 border-b hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <Link href={notification.action_url || '#'} className="block">
                                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                            <p className="text-sm text-gray-500 truncate">{notification.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </p>
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="px-4 py-2 border-t text-center">
                            <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
                                View All
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
