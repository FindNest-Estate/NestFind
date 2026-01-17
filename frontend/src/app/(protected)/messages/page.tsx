'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    MessageCircle,
    Send,
    ArrowLeft,
    Loader2,
    AlertCircle,
    User,
    Home,
    Inbox
} from 'lucide-react';
import { get, post, put } from '@/lib/api';

/**
 * Messages Page - /messages
 * 
 * Conversation list with message thread view.
 */

interface OtherParty {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Conversation {
    id: string;
    property_id: string | null;
    property_title: string | null;
    other_party: OtherParty;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
    updated_at: string;
}

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    is_own: boolean;
    read_at: string | null;
    created_at: string;
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-IN', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
}

export default function MessagesPage() {
    const searchParams = useSearchParams();
    const activeId = searchParams.get('id');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load conversations
    useEffect(() => {
        async function load() {
            try {
                const data = await get<{ conversations: Conversation[] }>('/conversations');
                setConversations(data.conversations);

                // If activeId from URL, select that conversation
                if (activeId) {
                    const conv = data.conversations.find(c => c.id === activeId);
                    if (conv) setActiveConversation(conv);
                }
            } catch (err: any) {
                setError(err?.message || 'Failed to load conversations');
            } finally {
                setIsLoadingConvs(false);
            }
        }
        load();
    }, [activeId]);

    // Load messages when conversation selected
    const loadMessages = useCallback(async (convId: string) => {
        setIsLoadingMsgs(true);
        try {
            const data = await get<{ messages: Message[] }>(`/conversations/${convId}/messages`);
            setMessages(data.messages);
            // Mark as read
            await put(`/conversations/${convId}/read`, {});
        } catch (err: any) {
            setError(err?.message || 'Failed to load messages');
        } finally {
            setIsLoadingMsgs(false);
        }
    }, []);

    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation.id);
        }
    }, [activeConversation, loadMessages]);

    const handleSelectConversation = (conv: Conversation) => {
        setActiveConversation(conv);
        // Update URL without navigation
        window.history.pushState({}, '', `/messages?id=${conv.id}`);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversation || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            await post(`/conversations/${activeConversation.id}/messages`, { content });
            // Refresh messages
            await loadMessages(activeConversation.id);
        } catch (err: any) {
            setError(err?.message || 'Failed to send message');
            setNewMessage(content); // Restore message on error
        } finally {
            setIsSending(false);
        }
    };

    if (isLoadingConvs) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Conversation List */}
            <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-lg font-bold text-gray-900">Messages</h1>
                </div>

                {conversations.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No conversations yet</p>
                            <p className="text-sm text-gray-400 mt-1">Contact an agent from a property listing</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full p-4 flex gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 ${activeConversation?.id === conv.id ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <User className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-gray-900 truncate">{conv.other_party.name}</span>
                                        {conv.last_message_at && (
                                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                                {formatTime(conv.last_message_at)}
                                            </span>
                                        )}
                                    </div>
                                    {conv.property_title && (
                                        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
                                            <Home className="w-3 h-3" />
                                            <span className="truncate">{conv.property_title}</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 truncate mt-0.5">
                                        {conv.last_message || 'No messages yet'}
                                    </p>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                        {conv.unread_count}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Message Thread */}
            <div className={`flex-1 flex flex-col ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                            <button
                                onClick={() => setActiveConversation(null)}
                                className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{activeConversation.other_party.name}</div>
                                <div className="text-xs text-gray-500">{activeConversation.other_party.role}</div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {isLoadingMsgs ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <MessageCircle className="w-10 h-10 mx-auto mb-2" />
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.is_own
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                            <div className={`text-xs mt-1 ${msg.is_own ? 'text-emerald-200' : 'text-gray-400'}`}>
                                                {formatTime(msg.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm mt-1">Choose from your existing conversations</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
                </div>
            )}
        </div>
    );
}
