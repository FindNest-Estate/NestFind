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
            <div className="glass-card border border-white/60 p-6 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/5 via-transparent to-transparent opacity-50" />
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                        Messages
                    </h2>
                    <Link href="/messages" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center transition-colors">
                        Inbox <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Link>
                </div>
                
                {/* Embedded Mock Messaging Interface for Empty State */}
                <div className="rounded-2xl border border-white/60 bg-white/40 p-5 relative overflow-hidden shadow-inner flex flex-col justify-end">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    
                    <div className="space-y-4 relative z-10 w-full mb-6 max-w-[280px] mx-auto opacity-50 select-none grayscale-[50%]">
                        {/* Agent mock message */}
                        <div className="flex items-end gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mb-1">
                                <User className="w-3 h-3 text-indigo-400" />
                            </div>
                            <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-sm shadow-sm text-xs font-medium text-gray-500 max-w-[85%]">
                                Hi there! Would you like to schedule a tour for the 3BHK apartment?
                            </div>
                        </div>

                        {/* User mock message */}
                        <div className="flex items-end gap-2 justify-end">
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl rounded-br-sm shadow-sm text-xs font-medium text-indigo-600 max-w-[85%]">
                                Yes, is tomorrow at 10 AM available?
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 text-center bg-white/80 backdrop-blur-md py-4 px-6 rounded-xl border border-white shadow-[0_-10px_40px_rgba(255,255,255,0.8)] mt-auto">
                        <MessageSquare className="w-6 h-6 text-indigo-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-900">Your inbox is empty</p>
                        <p className="text-[11px] text-gray-500 mt-1 mb-4 font-medium leading-relaxed">
                            Start chatting with property owners and agents to negotiate deals and schedule tours.
                        </p>
                        <Link href="/properties" className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow">
                            Find Agents to Text
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card border border-white/60 p-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/5 via-transparent to-transparent opacity-50" />
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[var(--color-brand)]" />
                    Messages
                </h2>
                <Link href="/messages" className="text-sm font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-dark)] hover:underline flex items-center transition-colors">
                    Inbox <ChevronRight className="w-4 h-4 ml-0.5" />
                </Link>
            </div>

            <div className="space-y-3 relative z-10">
                {conversations.map(conv => (
                    <Link
                        href={`/messages?conversation=${conv.id}`}
                        key={conv.id}
                        className={`group flex items-start gap-4 p-4 rounded-xl border border-white/60 bg-white/40 hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${conv.unread_count > 0 ? 'shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-blue-100/50' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-subtle)] to-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center flex-shrink-0 border border-white shadow-sm group-hover:shadow transition-shadow">
                            <span className="font-black text-lg">
                                {conv.other_party.name.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className={`font-bold text-[15px] truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
                                    {conv.other_party.name}
                                </h3>
                                {conv.last_message_at && (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ml-2 ${conv.unread_count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium'}`}>
                                    {conv.last_message || "Started a conversation"}
                                </p>
                                {conv.unread_count > 0 && (
                                    <span className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm text-white text-[10px] font-black rounded-full flex items-center justify-center mt-0.5">
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
