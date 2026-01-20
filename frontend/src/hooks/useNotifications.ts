import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { get, put } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

interface UseNotificationsReturn {
    notifications: NotificationItem[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchNotifications: (page?: number) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
    const { token, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            const data = await get<{ count: number }>('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    }, [token]);

    // Fetch notifications list
    const fetchNotifications = useCallback(async (page = 1) => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await get<{ notifications: NotificationItem[], pagination: any }>(`/notifications?page=${page}`);
            if (page === 1) {
                setNotifications(data.notifications);
            } else {
                setNotifications(prev => [...prev, ...data.notifications]);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Mark single as read
    const markAsRead = async (id: string) => {
        if (!token) return;
        try {
            await put(`/notifications/${id}/read`, {});
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        if (!token) return;
        try {
            await put('/notifications/read-all', {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    // Initial load
    useEffect(() => {
        if (token && user) {
            fetchUnreadCount();
        }
    }, [token, user, fetchUnreadCount]);

    // SSE Connection
    useEffect(() => {
        if (!token || !user) return;

        // Use query param for token as EventSource doesn't support headers
        const url = `${API_BASE_URL}/notifications/stream?token=${token}`;
        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            try {
                // Determine if it's a notification event (backend might send different types)
                // Backend NotificationsService sends generic messages.
                // Protocol: data: { ... }
                // Let's assume the payload is JSON for the notification
                // Check notifications_service.py broadcast structure:
                // broadcast(user_id, "NOTIFICATION_NEW", notification_data)
                // The SSE manager likely wraps this.
                // Assuming raw JSON data in event.data

                // Note: The sse_manager implementation details matter here.
                // If sse_manager sends "event: NOTIFICATION_NEW" then "data: {...}"
                // we should listen to that event type.
                // For now, onmessage catches all 'message' events.

                const data = JSON.parse(event.data);

                // If it looks like a notification
                if (data.title && data.type) {
                    setNotifications(prev => [data, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            } catch (e) {
                console.error("SSE Parse Error", e);
            }
        };

        eventSource.onerror = (e) => {
            // console.error("SSE Error", e);
            eventSource.close();
            // Reconnection logic is handled by browser native EventSource usually, but simple close stops it.
            // We'll let it try to reconnect or just fail silently to avoid spam.
        };

        return () => {
            eventSource.close();
        };
    }, [token, user]);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        fetchNotifications
    };
}
