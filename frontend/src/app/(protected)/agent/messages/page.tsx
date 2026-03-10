'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Send,
    MoreVertical,
    Phone,
    Video,
    Image as ImageIcon,
    Paperclip,
    Check,
    CheckCheck,
    Loader2,
    MessageSquare,
    User,
    ArrowLeft
} from 'lucide-react';
import {
    getAgentMessages,
    sendAgentMessage
} from '@/lib/api/agent';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

// Types
interface Message {
    id: string;
    sender_id: string;
    content: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    type: 'text' | 'image' | 'file';
}

interface Conversation {
    id: string;
    participant: {
        id: string;
        name: string;
        avatar?: string;
        role: string;
        status?: 'online' | 'offline';
        last_seen?: string;
    };
    last_message: Message;
    unread_count: number;
    messages?: Message[]; // Populated when selected
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Refs for scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedId, conversations]);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const res = await getAgentMessages();
            if (res.success) {
                // Determine user ID (assuming 'me' for now as current user isn't in context easily)
                // Real implementation would filter based on current user ID
                setConversations(res.conversations as unknown as Conversation[]);

                // Select first conversation if desktop and none selected
                if (window.innerWidth >= 768 && !selectedId && res.conversations.length > 0) {
                    setSelectedId(res.conversations[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !selectedId || isSending) return;

        const tempId = `temp-${Date.now()}`;
        const newMessage: Message = {
            id: tempId,
            sender_id: 'me', // Optimistic
            content: messageInput,
            timestamp: new Date().toISOString(),
            status: 'sent',
            type: 'text'
        };

        // Optimistic update
        setConversations(prev => prev.map(c => {
            if (c.id === selectedId) {
                return {
                    ...c,
                    messages: [...(c.messages || []), newMessage],
                    last_message: newMessage
                };
            }
            return c;
        }));

        setMessageInput('');
        setIsSending(true);

        try {
            const res = await sendAgentMessage({
                conversation_id: selectedId,
                content: newMessage.content,
                message_type: 'text'
            });

            if (res.success) {
                // Update with real ID from backend if needed
            }
        } catch (error) {
            console.error("Failed to send", error);
            // Revert optimistic update in real app
        } finally {
            setIsSending(false);
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedId);

    // Mock messages if API returns empty array for messages property (API gap handling)
    // The previous getAgentMessages outlines returning conversation overview, 
    // but individual messages might need a separate call or be included. 
    // We'll assume they are included or we stick to optimistic for now.

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border border-[var(--gray-200)] shadow-sm overflow-hidden">
            {/* Sidebar / List */}
            <div className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-[var(--gray-200)]`}>
                <div className="p-4 border-b border-[var(--gray-200)]">
                    <h2 className="text-xl font-bold text-[var(--gray-900)] mb-4">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray-400)]" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--gray-400)]" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-10 px-4 text-[var(--gray-500)]">
                            <p>No conversations yet.</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={`w-full text-left p-4 hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--gray-100)] last:border-0 ${selectedId === conv.id ? 'bg-[var(--color-brand-subtle)] hover:bg-[var(--color-brand-subtle)]' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-semibold text-sm truncate ${selectedId === conv.id ? 'text-[var(--color-brand)]' : 'text-[var(--gray-900)]'}`}>
                                        {conv.participant.name}
                                    </h3>
                                    <span className="text-[10px] text-[var(--gray-400)] shrink-0">
                                        {new Date(conv.last_message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-[var(--gray-500)] truncate max-w-[180px]">
                                        {conv.last_message.sender_id === 'me' && 'You: '}
                                        {conv.last_message.content}
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <span className="bg-[var(--color-brand)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedId && selectedConversation ? (
                <div className={`${!selectedId ? 'hidden md:flex' : 'flex'} flex-col flex-1 h-full`}>
                    {/* Header */}
                    <div className="h-16 px-6 border-b border-[var(--gray-200)] flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedId(null)} className="md:hidden p-1 -ml-2 text-[var(--gray-600)]">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-[var(--gray-200)] flex items-center justify-center overflow-hidden">
                                    {selectedConversation.participant.avatar ? (
                                        <img src={selectedConversation.participant.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-[var(--gray-500)]" />
                                    )}
                                </div>
                                {selectedConversation.participant.status === 'online' && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--gray-900)]">{selectedConversation.participant.name}</h3>
                                <p className="text-xs text-[var(--gray-500)]">
                                    {selectedConversation.participant.status === 'online' ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-[var(--gray-400)] hover:text-[var(--color-brand)] hover:bg-[var(--gray-50)] rounded-full transition-colors">
                                <Phone className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-[var(--gray-400)] hover:text-[var(--color-brand)] hover:bg-[var(--gray-50)] rounded-full transition-colors">
                                <Video className="w-5 h-5" />
                            </button>
                            <div className="w-px h-6 bg-[var(--gray-200)] mx-2" />
                            <button className="p-2 text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-50)] rounded-full transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--gray-50)]" ref={scrollRef}>
                        {/* Date Divider (Mock) */}
                        <div className="flex justify-center">
                            <span className="text-[10px] font-medium text-[var(--gray-400)] bg-[var(--gray-200)] px-3 py-1 rounded-full">
                                Today
                            </span>
                        </div>

                        {selectedConversation.messages?.map((msg, idx) => {
                            const isMe = msg.sender_id === 'me';
                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                                        ? 'bg-[var(--color-brand)] text-white rounded-tr-none'
                                        : 'bg-white text-[var(--gray-900)] border border-[var(--gray-200)] rounded-tl-none'
                                        }`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-white/70' : 'text-[var(--gray-400)]'
                                            }`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && (
                                                msg.status === 'read' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[var(--gray-200)]">
                        <div className="flex items-center gap-3">
                            <button type="button" className="p-2 text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-50)] rounded-full transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <button type="button" className="p-2 text-[var(--gray-400)] hover:text-[var(--gray-600)] hover:bg-[var(--gray-50)] rounded-full transition-colors">
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 py-2.5 px-4 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] focus:bg-white transition-all text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!messageInput.trim() || isSending}
                                className={`p-2.5 rounded-full text-white transition-all shadow-sm ${!messageInput.trim() || isSending
                                    ? 'bg-[var(--gray-300)] cursor-not-allowed'
                                    : 'bg-[var(--color-brand)] hover:brightness-110 active:scale-95'
                                    }`}
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center flex-col text-[var(--gray-400)] bg-[var(--gray-50)]">
                    <div className="w-16 h-16 bg-[var(--gray-200)] rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8 text-[var(--gray-400)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--gray-600)]">Your Messages</h3>
                    <p className="text-sm max-w-xs text-center mt-2">Select a conversation from the sidebar to start chatting.</p>
                </div>
            )}
        </div>
    );
}
