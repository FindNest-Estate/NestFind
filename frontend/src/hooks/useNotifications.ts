import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface NotificationEvent {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string;
    created_at: string;
}

export function useNotifications() {
    const { token, user } = useAuth();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (!token || !user) return;

        // Use token in query param for SSE authentication
        const url = `${API_URL}/notifications/stream?token=${token}`;

        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            console.log('SSE Connected');
        };

        eventSource.onmessage = (event) => {
            try {
                // Parse the data payload
                const rawData = event.data;
                // Double parse if it's double encoded or just parse once
                // The backend sends: data: {"type":..., "data":...}\n\n
                // event.data will be the JSON string.
                const envelope = JSON.parse(rawData);

                if (envelope.type === 'NOTIFICATION_NEW') {
                    const notif: NotificationEvent = envelope.data;
                    toast(notif.title, {
                        description: notif.body,
                        action: notif.link ? {
                            label: 'View',
                            onClick: () => window.location.href = notif.link
                        } : undefined,
                        duration: 5000,
                    });
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
            // Optional: Implement retry logic here if native retry isn't sufficient
        };

        return () => {
            eventSource.close();
        };
    }, [token, user, API_URL]);
}
