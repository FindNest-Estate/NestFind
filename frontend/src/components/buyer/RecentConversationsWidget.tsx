'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronRight, User } from 'lucide-react';
import { getRecentConversations, RecentConversation } from '@/lib/api/buyer';
import { formatDistanceToNow } from 'date-fns';

export default function RecentConversationsWidget() {
    const [conversations, setConversations] = useState<RecentConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const data = await getRecentConversations();
                setConversations(data.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch recent conversations", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConvos();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5 animate-pulse">
                <div className="h-5 w-40 bg-[var(--gray-200)] rounded mb-5"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 bg-[var(--gray-200)] rounded-full"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-[var(--gray-200)] rounded w-1/3"></div>
                                <div className="h-3 bg-[var(--gray-100)] rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[var(--color-brand)]" />
                        Messages
                    </h2>
                </div>
                <div className="text-center py-6 bg-[var(--gray-50)] rounded-[var(--radius-sm)] border border-dashed border-[var(--gray-200)]">
                    <MessageSquare className="w-8 h-8 text-[var(--gray-300)] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--gray-900)]">No messages yet</p>
                    <p className="text-xs text-[var(--gray-500)] mt-1 mb-4">Chat with agents to schedule tours or ask questions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[var(--card-radius)] border border-[var(--gray-200)] p-5">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-[var(--gray-900)] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[var(--color-brand)]" />
                    Messages
                </h2>
                <Link href="/messages" className="text-sm font-medium text-[var(--color-brand)] hover:underline flex items-center">
                    Inbox <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-1">
                {conversations.map(conv => (
                    <Link
                        href={`/messages?conversation=${conv.id}`}
                        key={conv.id}
                        className={`group flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--gray-50)] transition-colors ${conv.unread_count > 0 ? 'bg-blue-50/50' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] flex items-center justify-center flex-shrink-0 border border-[var(--color-brand)]/20">
                            <span className="font-bold text-sm">
                                {conv.other_party.name.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className={`font-semibold text-sm truncate ${conv.unread_count > 0 ? 'text-[var(--gray-900)]' : 'text-[var(--gray-800)]'}`}>
                                    {conv.other_party.name}
                                </h3>
                                {conv.last_message_at && (
                                    <span className={`text-[10px] whitespace-nowrap ml-2 ${conv.unread_count > 0 ? 'text-blue-600 font-bold' : 'text-[var(--gray-500)]'}`}>
                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-[var(--gray-900)] font-medium' : 'text-[var(--gray-500)]'}`}>
                                    {conv.last_message || "Started a conversation"}
                                </p>
                                {conv.unread_count > 0 && (
                                    <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
